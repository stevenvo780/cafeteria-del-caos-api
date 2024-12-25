import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, UpdateResult } from 'typeorm';
import { UserDiscord } from './entities/user-discord.entity';
import { FindUsersDto, SortOrder } from './dto/find-users.dto';
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
      sortBy = 'points',
      sortOrder = SortOrder.DESC,
    } = findUsersDto;

    const queryBuilder = this.userDiscordRepository.createQueryBuilder('user');

    if (search) {
      queryBuilder.where('LOWER(user.username) LIKE LOWER(:search)', {
        search: `%${search}%`,
      });
    }

    if (minPoints !== undefined) {
      queryBuilder.andWhere('user.points >= :minPoints', { minPoints });
    }

    if (maxPoints !== undefined) {
      queryBuilder.andWhere('user.points <= :maxPoints', { maxPoints });
    }

    const sortMapping = {
      points: 'points',
      coins: 'coins',
    };

    const orderByColumn = sortMapping[sortBy] || 'points';

    queryBuilder
      .orderBy(`user.${orderByColumn}`, sortOrder)
      .limit(limit)
      .offset(offset);

    const [users, total] = await queryBuilder.getManyAndCount();

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

  async remove(id: string): Promise<UserDiscord> {
    try {
      const user = await this.findOne(id);
      await this.userDiscordRepository.delete(id);
      return user;
    } catch (error) {
      console.log(error);
      throw new NotFoundException(`error deleting user with ID ${id}`);
    }
  }

  async findOrCreate(discordData: any): Promise<UserDiscord> {
    let user = await this.userDiscordRepository.findOne({
      where: { id: discordData.id },
    });

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
      let message: string;

      switch (operation) {
        case 'add':
          await this.addPenaltyPoints(discordUser.id, points);
          newPoints = discordUser.points + points;
          message = `💀 BOOM! ${discordUser.username} la cagó. ${points} PUNTOS DE CASTIGO AÑADIDOS. Ahora tiene ${newPoints} puntos de SHAME!`;
          break;
        case 'remove':
          await this.addPenaltyPoints(discordUser.id, -points);
          newPoints = discordUser.points - points;
          message = `😎 ${discordUser.username} se redimió. ${points} puntos menos de vergüenza. Aún carga con ${newPoints} puntos.`;
          break;
        case 'set':
          await this.updatePoints(discordUser.id, points);
          newPoints = points;
          message = `⚖️ SE HA HABLADO! ${discordUser.username} ahora tiene ${newPoints} puntos porque YO LO DIGO!`;
          break;
      }

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: message },
      };
    } catch (error) {
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content:
            '💀 LA OPERACIÓN SE FUE A LA MIERDA! Inténtalo de nuevo, si te atreves.',
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
          content:
            '❌ Error: ¡Usuario no encontrado en los registros del caos!',
        },
      };
    }

    if (fromUser.coins < amount) {
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: `❌ ¡INSENSATO! ${fromUser.username}, no puedes transferir lo que no posees.\n💰 Tu saldo actual es de ${fromUser.coins} monedas.`,
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
        content: `✨ ¡TRANSFERENCIA EXITOSA!\n\n💸 ${
          fromUser.username
        } ha enviado ${amount} monedas a ${
          toUser.username
        }\n\n💰 Nuevos balances:\n${fromUser.username}: ${
          fromUser.coins - amount
        } monedas\n${toUser.username}: ${toUser.coins + amount} monedas`,
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
          message = `💰 LLUVIA DE MONEDAS! ${discordUser.username} recibe ${coins} monedas del CAOS!`;
          break;
        case 'remove':
          await this.addCoins(discordUser.id, -coins);
          message = `🔥 GET REKT ${discordUser.username}! Perdiste ${coins} monedas, AJAJAJA!`;
          break;
        case 'set':
          await this.updateCoins(discordUser.id, coins);
          message = `⚡ ESTABLECIDO! ${discordUser.username} ahora tiene ${coins} monedas porque así lo decreto!`;
          break;
        case 'transfer':
          if (!targetId) throw new Error('targetId required for transfer');
          return await this.transferCoins(userId, targetId, coins);
      }

      const updatedUser = await this.findOne(discordUser.id);
      message += `\n💎 Balance total: ${updatedUser?.coins} monedas en el banco del CAOS!`;

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: message },
      };
    } catch (error) {
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content:
            '💀 LA OPERACIÓN SE FUE A LA MIERDA! Inténtalo de nuevo, si te atreves.',
        },
      };
    }
  }

  async findTopRanking(limit = 10): Promise<UserDiscord[]> {
    return this.userDiscordRepository
      .createQueryBuilder('user')
      .orderBy('user.points', 'ASC')
      .addOrderBy('user.coins', 'DESC')
      .limit(limit)
      .getMany();
  }
}
