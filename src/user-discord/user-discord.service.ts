import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, UpdateResult } from 'typeorm';
import { UserDiscord } from './entities/user-discord.entity';
import { FindUsersDto, SortOrder } from './dto/find-users.dto';
import {
  InteractPoints,
  InteractCoins,
  DiscordCommandResponse,
} from '../discord/discord.types';
import { InteractionResponseType } from 'discord.js';
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
      experience: 'experience',
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
  ): Promise<DiscordCommandResponse> {
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

  async handleAddPoints(data: InteractPoints): Promise<DiscordCommandResponse> {
    return this.handlePointsOperation(data, 'add');
  }

  async handleRemovePoints(
    data: InteractPoints,
  ): Promise<DiscordCommandResponse> {
    return this.handlePointsOperation(data, 'remove');
  }

  async handleSetPoints(data: InteractPoints): Promise<DiscordCommandResponse> {
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
  ): Promise<DiscordCommandResponse> {
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
  ): Promise<DiscordCommandResponse> {
    try {
      const { userId, targetId, coins, username, roles } = data;
      const discordUser = await this.findOrCreate({
        id: userId,
        username,
        roles,
      });

      let message: string;
      let experienceGained = 0;

      switch (operation) {
        case 'add':
          await this.addCoins(discordUser.id, coins);
          experienceGained = Math.floor(coins / 2);
          await this.addExperience(discordUser.id, experienceGained);
          message = `💰 LLUVIA DE MONEDAS! ${discordUser.username} recibe ${coins} monedas y ${experienceGained} de experiencia del CAOS!`;
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
      message += `\n💎 Balance total: ${updatedUser?.coins} monedas y ${updatedUser?.experience} XP en el banco del CAOS!`;

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

  async addExperience(id: string, amount: number): Promise<UpdateResult> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException(
        `Usuario de Discord con ID ${id} no encontrado`,
      );
    }
    const newExperience = user.experience + amount;
    return this.userDiscordRepository.update(id, { experience: newExperience });
  }

  async findTopByExperience(limit = 10): Promise<UserDiscord[]> {
    return this.userDiscordRepository
      .createQueryBuilder('user')
      .orderBy('user.experience', 'DESC')
      .limit(limit)
      .getMany();
  }

  async findTopRanking(limit = 10): Promise<UserDiscord[]> {
    return this.userDiscordRepository
      .createQueryBuilder('user')
      .orderBy('user.points', 'ASC')
      .addOrderBy('user.coins', 'DESC')
      .limit(limit)
      .getMany();
  }

  async findTopByCoins(limit = 10): Promise<UserDiscord[]> {
    return this.userDiscordRepository
      .createQueryBuilder('user')
      .orderBy('user.coins', 'DESC')
      .limit(limit)
      .getMany();
  }

  async handleExperienceOperation(
    data: InteractPoints,
    operation: 'add' | 'remove' | 'set',
  ): Promise<DiscordCommandResponse> {
    try {
      const { userId, points: amount, username, roles } = data;
      const discordUser = await this.findOrCreate({
        id: userId,
        username,
        roles,
      });

      if (operation === 'remove' && discordUser.experience < amount) {
        return {
          type: InteractionResponseType.ChannelMessageWithSource as const,
          data: {
            content: `❌ Error: ${discordUser.username} solo tiene ${discordUser.experience} XP. No puedes quitar ${amount} XP.`,
          },
        };
      }

      let message: string;

      switch (operation) {
        case 'add':
          await this.addExperience(discordUser.id, amount);
          message = `✨ ¡SUBIDA DE NIVEL! ${discordUser.username} ha ganado ${amount} puntos de experiencia.`;
          break;
        case 'remove':
          await this.addExperience(discordUser.id, -amount);
          message = `📉 ¡PÉRDIDA DE EXPERIENCIA! ${discordUser.username} ha perdido ${amount} puntos de experiencia.`;
          break;
        case 'set':
          await this.updateExperience(discordUser.id, amount);
          message = `⚡ ¡EXPERIENCIA ESTABLECIDA! ${discordUser.username} ahora tiene ${amount} puntos de experiencia.`;
          break;
        default:
          throw new Error('Operación no válida');
      }

      const updatedUser = await this.findOne(discordUser.id);
      const currentLevel = Math.floor(updatedUser.experience / 100);
      const nextLevel = (currentLevel + 1) * 100;
      const xpToNextLevel = nextLevel - updatedUser.experience;

      message += `\n📊 Estadísticas:`;
      message += `\n🎯 Experiencia total: ${updatedUser.experience} XP`;
      message += `\n📈 Nivel actual: ${currentLevel}`;
      message += `\n🎮 Experiencia para siguiente nivel: ${xpToNextLevel} XP`;

      if (operation === 'add') {
        const previousLevel = Math.floor(
          (updatedUser.experience - amount) / 100,
        );
        if (currentLevel > previousLevel) {
          message += `\n🎉 ¡FELICIDADES! Has subido al nivel ${currentLevel}!`;
        }
      }

      return {
        type: InteractionResponseType.ChannelMessageWithSource as const,
        data: { content: message },
      };
    } catch (error) {
      console.error('Error al procesar operación de experiencia:', error);
      return {
        type: InteractionResponseType.ChannelMessageWithSource as const,
        data: {
          content: '❌ Error al procesar la operación de experiencia.',
        },
      };
    }
  }

  async updateExperience(
    id: string,
    experience: number,
  ): Promise<UpdateResult> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException(
        `Usuario de Discord con ID ${id} no encontrado`,
      );
    }
    return this.userDiscordRepository.update(id, { experience });
  }

  async getUserExperience(userId: string): Promise<DiscordCommandResponse> {
    try {
      const user = await this.findOne(userId);
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: `🌟 ${user.username} tiene ${user.experience} puntos de experiencia acumulados.`,
        },
      };
    } catch (error) {
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: '❌ No se pudo encontrar la información del usuario.',
        },
      };
    }
  }

  async getTopExperienceRanking(): Promise<DiscordCommandResponse> {
    try {
      const users = await this.findTopByExperience(10);
      const rankingMessage = users
        .map((user, index) => {
          const medal =
            index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '✨';
          return `${medal} ${index + 1}. ${user.username}: ${
            user.experience
          } XP`;
        })
        .join('\n');

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: `🏆 **TOP 10 - EXPERIENCIA**\n\n${rankingMessage}`,
        },
      };
    } catch (error) {
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: '❌ Error al obtener el ranking de experiencia.',
        },
      };
    }
  }
}
