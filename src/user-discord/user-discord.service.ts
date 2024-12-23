import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, UpdateResult } from 'typeorm';
import { UserDiscord } from './entities/user-discord.entity';
import { FindUsersDto, SortOrder } from './dto/find-users.dto'; // Añadido SortOrder

@Injectable()
export class UserDiscordService {
  constructor(
    @InjectRepository(UserDiscord)
    private userDiscordRepository: Repository<UserDiscord>,
  ) {}

  async findOrCreate(discordData: any): Promise<UserDiscord> {
    let user = await this.findOne(discordData.id);

    if (!user) {
      user = this.userDiscordRepository.create({
        id: discordData.id,
        username: discordData.username,
        nickname: discordData.nickname,
        roles: discordData.roles || [],
        discordData: discordData,
      });
      await this.userDiscordRepository.save(user);
    } else {
      // Actualizar roles si han cambiado
      if (
        discordData.roles &&
        JSON.stringify(user.roles) !== JSON.stringify(discordData.roles)
      ) {
        await this.userDiscordRepository.update(user.id, {
          roles: discordData.roles,
          username: discordData.username,
          nickname: discordData.nickname,
        });
      }
    }

    return user;
  }

  async hasRole(userId: string, roleId: string): Promise<boolean> {
    const user = await this.findOne(userId);
    if (!user) return false;
    return user.roles.some((role) => role.id === roleId);
  }

  create(createUserDto: Partial<UserDiscord>): Promise<UserDiscord> {
    return this.userDiscordRepository.save(createUserDto);
  }

  async findAll(
    findUsersDto: FindUsersDto,
  ): Promise<{ users: UserDiscord[]; total: number }> {
    const {
      limit = 10,
      offset = 0,
      search,
      minPoints,
      maxPoints,
      roleIds,
      sortBy = 'createdAt',
      sortOrder = SortOrder.DESC,
    } = findUsersDto;

    const queryBuilder = this.userDiscordRepository.createQueryBuilder('user');

    if (search) {
      queryBuilder.where(
        '(user.username ILIKE :search OR user.nickname ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (minPoints !== undefined) {
      queryBuilder.andWhere('user.penaltyPoints >= :minPoints', { minPoints });
    }

    if (maxPoints !== undefined) {
      queryBuilder.andWhere('user.penaltyPoints <= :maxPoints', { maxPoints });
    }

    if (roleIds && roleIds.length > 0) {
      queryBuilder.andWhere('user.roles::jsonb ?| array[:...roleIds]', {
        roleIds,
      });
    }

    const [users, total] = await queryBuilder
      .orderBy(`user.${sortBy}`, sortOrder)
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { users, total };
  }

  findOne(id: string): Promise<UserDiscord | null> {
    return this.userDiscordRepository.findOne({ where: { id } });
  }

  async updateRoles(
    id: string,
    roles: UserDiscord['roles'],
  ): Promise<UpdateResult> {
    return this.userDiscordRepository.update(id, { roles });
  }

  async addPenaltyPoints(id: string, points: number): Promise<UpdateResult> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException(
        `Usuario de Discord con ID ${id} no encontrado`,
      );
    }

    const newPoints = user.penaltyPoints + points;
    return this.userDiscordRepository.update(id, { penaltyPoints: newPoints });
  }

  async updatePoints(id: string, points: number): Promise<UpdateResult> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException(
        `Usuario de Discord con ID ${id} no encontrado`,
      );
    }
    return this.userDiscordRepository.update(id, { penaltyPoints: points });
  }
}
