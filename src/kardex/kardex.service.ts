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
    await this.validateUser(dto.userDiscordId);
    const lastBalance = await this.getUserLastBalance(dto.userDiscordId);
    const newBalance =
      dto.operation === KardexOperation.IN
        ? lastBalance + dto.amount
        : lastBalance - dto.amount;

    const entry = this.kardexRepository.create({
      ...dto,
      balance: newBalance,
    });
    return this.kardexRepository.save(entry);
  }

  async update(id: number, dto: UpdateKardexDto): Promise<Kardex> {
    const kardex = await this.kardexRepository.findOne({ where: { id } });
    if (!kardex) throw new NotFoundException(`Kardex ID ${id} not found`);

    Object.assign(kardex, dto);
    return this.kardexRepository.save(kardex);
  }

  async getUserLastBalance(userDiscordId: string): Promise<number> {
    const entry = await this.kardexRepository.findOne({
      where: { userDiscord: { id: userDiscordId } },
      order: { createdAt: 'DESC' },
    });
    return entry?.balance || 0;
  }

  async addCoins(userDiscordId: string, amount: number, reference?: string) {
    return this.create({
      userDiscordId,
      operation: KardexOperation.IN,
      amount,
      reference,
    });
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

  async remove(id: number): Promise<Kardex> {
    const kardex = await this.findOne(id);
    await this.kardexRepository.delete(id);
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
    const queryBuilder = this.kardexRepository.createQueryBuilder('kardex');

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
      queryBuilder.andWhere('LOWER(userDiscord.id) LIKE LOWER(:search)', {
        search: `%${search}%`,
      });
    }

    if (search) {
      queryBuilder.andWhere('LOWER(userDiscord.username) LIKE LOWER(:search)', {
        search: `%${search}%`,
      });
    }

    if (startDate) {
      const start = new Date(filters.startDate);
      if (!isNaN(start.getTime())) {
        queryBuilder.andWhere('kardex.createdAt >= :startDate', { startDate: start });
      }
    }

    if (endDate) {
      const end = new Date(filters.endDate);
      if (!isNaN(end.getTime())) {
        queryBuilder.andWhere('kardex.createdAt <= :endDate', { endDate: end });
      }
    }

    const [items, total] = await queryBuilder
      .orderBy(`kardex.${sortBy}`, sortOrder)
      .leftJoinAndSelect('kardex.userDiscord', 'user_discord')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { items, total };
  }
}
