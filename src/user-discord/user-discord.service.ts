import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, UpdateResult } from 'typeorm';
import { UserDiscord } from './entities/user-discord.entity';
import { FindUsersDto, SortOrder } from './dto/find-users.dto'; // Añadido SortOrder
import { APIInteractionResponse, InteractionResponseType } from 'discord.js';
import { InteractPoints, InteractCoins } from '../discord/discord.types';
import { CreateUserDiscordDto } from './dto/create-user-discord.dto';
import { UpdateUserDiscordDto } from './dto/update-user-discord.dto';

@Injectable()
export class UserDiscordService {
  constructor(
    @InjectRepository(UserDiscord)
    private userDiscordRepository: Repository<UserDiscord>,
  ) {}

  async create(
    createUserDiscordDto: CreateUserDiscordDto,
  ): Promise<UserDiscord> {
    const user = this.userDiscordRepository.create(createUserDiscordDto);
    return this.userDiscordRepository.save(user);
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
      queryBuilder.andWhere('user.points >= :minPoints', { minPoints });
    }

    if (maxPoints !== undefined) {
      queryBuilder.andWhere('user.points <= :maxPoints', { maxPoints });
    }

    if (roleIds?.length) {
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

  async findOne(id: string): Promise<UserDiscord> {
    const user = await this.userDiscordRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return user;
  }

  async update(
    id: string,
    updateUserDiscordDto: UpdateUserDiscordDto,
  ): Promise<UserDiscord> {
    const user = await this.findOne(id);
    Object.assign(user, updateUserDiscordDto);
    console.log('Updated user:', user);
    return this.userDiscordRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const result = await this.userDiscordRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
  }

  async findOrCreate(discordData: any): Promise<UserDiscord> {
    let user = await this.findOne(discordData.id);

    if (!user) {
      user = this.userDiscordRepository.create({
        id: discordData.id,
        username: discordData.username,
        roles: discordData.roles || [],
        discordData: discordData,
      });
      await this.userDiscordRepository.save(user);
    } else {
      if (
        discordData.roles &&
        JSON.stringify(user.roles) !== JSON.stringify(discordData.roles)
      ) {
        await this.userDiscordRepository.update(user.id, {
          roles: discordData.roles,
          username: discordData.username,
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

    const newPoints = user.points + points;
    return this.userDiscordRepository.update(id, { points: newPoints });
  }

  async updatePoints(id: string, points: number): Promise<UpdateResult> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException(
        `Usuario de Discord con ID ${id} no encontrado`,
      );
    }
    return this.userDiscordRepository.update(id, { points: points });
  }

  async handlePointsOperation(
    data: InteractPoints,
    operation: 'add' | 'remove' | 'set',
  ): Promise<APIInteractionResponse> {
    try {
      const { userId, points, username, roles } = data;
      const discordUser = await this.findOrCreate({
        id: userId,
        username,
        roles,
      });

      let newPoints: number;
      let actionText: string;

      switch (operation) {
        case 'add':
          await this.addPenaltyPoints(discordUser.id, points);
          newPoints = discordUser.points + points;
          actionText = 'añadido';
          break;
        case 'remove':
          await this.addPenaltyPoints(discordUser.id, -points);
          newPoints = discordUser.points - points;
          actionText = 'quitado';
          break;
        case 'set':
          await this.updatePoints(discordUser.id, points);
          newPoints = points;
          actionText = 'establecido';
          break;
      }

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: `Se han ${actionText} ${points} puntos de penalización al usuario ${discordUser.username}. Total actual: ${newPoints} puntos.`,
        },
      };
    } catch (error) {
      console.error(`Error en operación de puntos ${operation}:`, error);
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: `Error al ${operation} puntos. Por favor, intenta nuevamente.`,
        },
      };
    }
  }

  async handleAddPoints(data: InteractPoints): Promise<APIInteractionResponse> {
    return this.handlePointsOperation(data, 'add');
  }

  async handleRemovePoints(
    data: InteractPoints,
  ): Promise<APIInteractionResponse> {
    return this.handlePointsOperation(data, 'remove');
  }

  async handleSetPoints(data: InteractPoints): Promise<APIInteractionResponse> {
    return this.handlePointsOperation(data, 'set');
  }

  async updateCoins(id: string, coins: number): Promise<UpdateResult> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException(
        `Usuario de Discord con ID ${id} no encontrado`,
      );
    }
    return this.userDiscordRepository.update(id, { coins });
  }

  async addCoins(id: string, amount: number): Promise<UpdateResult> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException(
        `Usuario de Discord con ID ${id} no encontrado`,
      );
    }
    const newCoins = user.coins + amount;
    return this.userDiscordRepository.update(id, { coins: newCoins });
  }

  async transferCoins(
    fromId: string,
    toId: string,
    amount: number,
  ): Promise<APIInteractionResponse> {
    const fromUser = await this.findOne(fromId);
    const toUser = await this.findOne(toId);

    if (!fromUser || !toUser) {
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: 'Error: Usuario no encontrado.',
        },
      };
    }

    if (fromUser.coins < amount) {
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content:
            'Error: No tienes suficientes monedas para realizar esta transferencia.',
        },
      };
    }

    await this.userDiscordRepository.update(fromId, {
      coins: fromUser.coins - amount,
    });
    await this.userDiscordRepository.update(toId, {
      coins: toUser.coins + amount,
    });

    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: `Transferencia exitosa: ${amount} monedas de ${fromUser.username} a ${toUser.username}`,
      },
    };
  }

  async handleCoinsOperation(
    data: InteractCoins,
    operation: 'add' | 'remove' | 'set' | 'transfer',
  ): Promise<APIInteractionResponse> {
    try {
      const { userId, targetId, coins, username, roles } = data;
      const discordUser = await this.findOrCreate({
        id: userId,
        username,
        roles,
      });

      let message: string;

      switch (operation) {
        case 'add':
          await this.addCoins(discordUser.id, coins);
          message = `Se han añadido ${coins} monedas al usuario ${discordUser.username}`;
          break;
        case 'remove':
          await this.addCoins(discordUser.id, -coins);
          message = `Se han quitado ${coins} monedas al usuario ${discordUser.username}`;
          break;
        case 'set':
          await this.updateCoins(discordUser.id, coins);
          message = `Se ha establecido el balance a ${coins} monedas para el usuario ${discordUser.username}`;
          break;
        case 'transfer':
          if (!targetId) throw new Error('targetId required for transfer');
          return await this.transferCoins(userId, targetId, coins);
      }

      const updatedUser = await this.findOne(discordUser.id);
      message += `. Balance actual: ${updatedUser?.coins} monedas.`;

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: message },
      };
    } catch (error) {
      console.error(`Error en operación de monedas ${operation}:`, error);
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: `Error al ${operation} monedas. Por favor, intenta nuevamente.`,
        },
      };
    }
  }
}
