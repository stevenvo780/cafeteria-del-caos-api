import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Kardex, KardexOperation } from './entities/kardex.entity';
import { CreateKardexDto } from './dto/create-kardex.dto';
import { UpdateKardexDto } from './dto/update-kardex.dto';
import { UserDiscord } from '../user-discord/entities/user-discord.entity';
import { FilterKardexDto } from './dto/filter-kardex.dto';

@Injectable()
export class KardexService {
  constructor(
    @InjectRepository(Kardex)
    private readonly kardexRepository: Repository<Kardex>,
    @InjectRepository(UserDiscord)
    private readonly userDiscordRepository: Repository<UserDiscord>,
  ) { }

  async create(dto: CreateKardexDto): Promise<Kardex> {
    if (dto.amount <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor a 0');
    }

    await this.validateUser(dto.userDiscordId);
    
    const queryRunner = this.kardexRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const lastBalance = await this.getUserLastBalance(dto.userDiscordId);
      
      if (dto.operation === KardexOperation.OUT && lastBalance < dto.amount) {
        throw new BadRequestException('Saldo insuficiente para realizar la operación');
      }

      const newBalance =
        dto.operation === KardexOperation.IN
          ? lastBalance + dto.amount
          : lastBalance - dto.amount;

      const entry = this.kardexRepository.create({
        ...dto,
        balance: newBalance,
      });

      const result = await queryRunner.manager.save(entry);
      await queryRunner.commitTransaction();
      return result;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getUserLastBalance(userDiscordId: string): Promise<number> {
    const entry = await this.kardexRepository.findOne({
      where: { userDiscord: { id: userDiscordId } },
      order: { createdAt: 'DESC' },
    });
    return entry?.balance || 0;
  }

  async addCoins(userDiscordId: string, amount: number, reference?: string) {
    try {
      return await this.create({
        userDiscordId,
        operation: KardexOperation.IN,
        amount,
        reference,
      });
    } catch (error) {
      throw new BadRequestException(`Error al añadir monedas: ${error.message}`);
    }
  }

  async removeCoins(userDiscordId: string, amount: number, reference?: string) {
    const lastBalance = await this.getUserLastBalance(userDiscordId);
    if (amount > lastBalance) {
      throw new NotFoundException(
        `Insufficient balance to remove ${amount} coins`,
      );
    }
    return this.create({
      userDiscordId,
      operation: KardexOperation.OUT,
      amount,
      reference,
    });
  }

  async setCoins(userDiscordId: string, amount: number, reference?: string) {
    const lastBalance = await this.getUserLastBalance(userDiscordId);
    if (amount === lastBalance) return;

    if (amount > lastBalance) {
      return this.addCoins(userDiscordId, amount - lastBalance, reference);
    } else {
      return this.removeCoins(userDiscordId, lastBalance - amount, reference);
    }
  }

  async transferCoins(
    fromId: string,
    toId: string,
    amount: number,
  ): Promise<void> {
    const fromBalance = await this.getUserLastBalance(fromId);
    if (fromBalance < amount) {
      throw new NotFoundException(
        `User with ID ${fromId} does not have enough balance`,
      );
    }
    await this.removeCoins(fromId, amount, `Transfer to ${toId}`);
    await this.addCoins(toId, amount, `Transfer from ${fromId}`);
  }

  async findAll(): Promise<Kardex[]> {
    return this.kardexRepository.find();
  }

  async findOne(id: number): Promise<Kardex> {
    const kardex = await this.kardexRepository.findOne({ where: { id } });
    if (!kardex) throw new NotFoundException(`Kardex ID ${id} not found`);
    return kardex;
  }

  private async validateUser(userDiscordId: string): Promise<void> {
    const user = await this.userDiscordRepository.findOne({
      where: { id: userDiscordId },
    });
    if (!user) {
      throw new NotFoundException(`UserDiscord ID ${userDiscordId} not found`);
    }
  }

  async findTopByCoins(
    limit = 10,
  ): Promise<{ userDiscordId: string; total: number }[]> {
    const query = this.kardexRepository
      .createQueryBuilder('k1')
      .select('k1.userDiscordId', 'userDiscordId')
      .addSelect('k1.balance', 'total')
      .where((qb) => {
        const subQuery = qb
          .subQuery()
          .select('MAX(k2.id)')
          .from(Kardex, 'k2')
          .where('k2.userDiscordId = k1.userDiscordId')
          .getQuery();
        return 'k1.id = ' + subQuery;
      })
      .orderBy('k1.balance', 'DESC')
      .limit(limit);

    const result = await query.getRawMany();

    return result.map((item) => ({
      userDiscordId: item.userDiscordId,
      total: parseInt(item.total) || 0,
    }));
  }

  async adjustBalanceToTarget(
    userDiscordId: string,
    targetBalance: number,
    reference?: string,
  ): Promise<Kardex> {
    const currentBalance = await this.getUserLastBalance(userDiscordId);

    if (currentBalance === targetBalance) {
      throw new Error('Target balance is equal to current balance');
    }

    const difference = targetBalance - currentBalance;
    const operation = difference > 0 ? KardexOperation.IN : KardexOperation.OUT;

    return this.create({
      userDiscordId,
      operation,
      amount: Math.abs(difference),
      reference,
    });
  }

  async findWithFilters(filters: FilterKardexDto) {
    const queryBuilder = this.kardexRepository
      .createQueryBuilder('kardex')
      .leftJoinAndSelect('kardex.userDiscord', 'userDiscord');

    const {
      limit = 10,
      offset = 0,
      search,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = filters;

    if (search) {
      queryBuilder.andWhere(
        '(CAST(userDiscord.id AS TEXT) LIKE :search OR LOWER(userDiscord.username) LIKE LOWER(:search) OR LOWER(kardex.reference) LIKE LOWER(:search))',
        { search: `%${search}%` }
      );
    }

    if (startDate) {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) {
        queryBuilder.andWhere('kardex.createdAt >= :startDate', { startDate: start });
      }
    }

    if (endDate) {
      const end = new Date(endDate);
      if (!isNaN(end.getTime())) {
        queryBuilder.andWhere('kardex.createdAt <= :endDate', { endDate: end });
      }
    }

    const [items, total] = await queryBuilder
      .orderBy(`kardex.${sortBy}`, sortOrder)
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { items, total };
  }
}
