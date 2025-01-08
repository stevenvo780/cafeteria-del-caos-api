import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, UpdateResult } from 'typeorm';
import { UserDiscord } from './entities/user-discord.entity';
import { FindUsersDto, SortOrder } from './dto/find-users.dto';
import {
  InteractPoints,
  DiscordCommandResponse,
} from '../discord/discord.types';
import { InteractionResponseType } from 'discord.js';
import { CreateUserDiscordDto } from './dto/create-user-discord.dto';
import { UpdateUserDiscordDto } from './dto/update-user-discord.dto';
import { KardexService } from '../kardex/kardex.service';

@Injectable()
export class UserDiscordService {
  constructor(
    @InjectRepository(UserDiscord)
    private readonly userDiscordRepository: Repository<UserDiscord>,
    private kardexService: KardexService,
  ) {}

  private async attachBalanceToUsers(
    users: UserDiscord[],
  ): Promise<(UserDiscord & { coins: number })[]> {
    const balances = await Promise.all(
      users.map((user) => this.kardexService.getUserLastBalance(user.id)),
    );

    return users.map((user, index) => ({
      ...user,
      coins: balances[index],
    }));
  }

  async create(
    createUserDiscordDto: CreateUserDiscordDto,
  ): Promise<UserDiscord> {
    const user = this.userDiscordRepository.create(createUserDiscordDto);
    return this.userDiscordRepository.save(user);
  }

  async findAll(
    findUsersDto: FindUsersDto,
  ): Promise<{ users: (UserDiscord & { coins: number })[]; total: number }> {
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
      experience: 'experience',
    };

    const orderByColumn = sortMapping[sortBy] || 'points';

    queryBuilder
      .orderBy(`user.${orderByColumn}`, sortOrder)
      .addOrderBy('user.id', 'ASC')
      .limit(limit)
      .offset(offset);

    const [users, total] = await queryBuilder.getManyAndCount();
    const usersWithCoins = await this.attachBalanceToUsers(users);

    return { users: usersWithCoins, total };
  }

  async findOne(id: string): Promise<UserDiscord & { coins: number }> {
    const user = await this.userDiscordRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    const coins = await this.kardexService.getUserLastBalance(id);
    return { ...user, coins };
  }

  async update(
    id: string,
    updateUserDiscordDto: UpdateUserDiscordDto,
  ): Promise<UserDiscord> {
    const user = await this.findOne(id);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    const updatedUser = {
      ...user,
      ...updateUserDiscordDto,
    };
    return this.userDiscordRepository.save(updatedUser);
  }

  async remove(id: string): Promise<UserDiscord> {
    try {
      const user = await this.findOne(id);
      await this.userDiscordRepository.delete(id);
      return user;
    } catch (error) {
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
      const objectUpdated = {
        username: discordData.username,
      };
      if (
        discordData.roles &&
        JSON.stringify(user.roles) !== JSON.stringify(discordData.roles)
      ) {
        objectUpdated['roles'] = discordData.roles;
      }
      await this.userDiscordRepository.update(user.id, objectUpdated);
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
    return this.userDiscordRepository.update(id, { points });
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
          message = `💀 ${discordUser.username} la regó y se ganó ${points} puntos malos. Total: ${newPoints}`;
          break;
        case 'remove':
          await this.addPenaltyPoints(discordUser.id, -points);
          newPoints = discordUser.points - points;
          message = `😎 ${discordUser.username} se portó mejor. Le quitamos ${points} puntos. Aún tiene ${newPoints}`;
          break;
        case 'set':
          await this.updatePoints(discordUser.id, points);
          newPoints = points;
          message = `⚖️ ${discordUser.username} ahora tiene ${newPoints} puntos porque así lo decidí`;
          break;
      }

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: message },
      };
    } catch (error) {
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: '💀 Error en la operación de puntos.' },
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

  async addExperience(userId: string, amount: number): Promise<UserDiscord> {
    const user = await this.findOne(userId);
    const updatedExperience = (user.experience || 0) + amount;
    await this.update(userId, { experience: updatedExperience });
    return this.findOne(userId);
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

  async findTopRanking(
    limit = 10,
  ): Promise<(UserDiscord & { coins: number })[]> {
    try {
      const users = await this.userDiscordRepository
        .createQueryBuilder('user')
        .orderBy('user.experience', 'DESC')
        .limit(limit)
        .getMany();

      return this.attachBalanceToUsers(users);
    } catch (error) {
      console.error('Error al obtener el ranking:', error);
      return [];
    }
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
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: `❌ Error: ${discordUser.username} solo tiene ${discordUser.experience} XP. No puedes quitar ${amount} XP.`,
          },
        };
      }

      let message: string;
      switch (operation) {
        case 'add':
          await this.addExperience(discordUser.id, amount);
          message = `✨ ${discordUser.username} ganó ${amount} XP.`;
          break;
        case 'remove':
          await this.addExperience(discordUser.id, -amount);
          message = `📉 ${discordUser.username} perdió ${amount} XP.`;
          break;
        case 'set':
          await this.updateExperience(discordUser.id, amount);
          message = `⚡ ${discordUser.username} tiene ${amount} XP ahora.`;
          break;
        default:
          throw new Error('Operación no válida');
      }

      const updatedUser = await this.findOne(discordUser.id);
      const currentLevel = Math.floor(updatedUser.experience / 100);
      const nextLevel = (currentLevel + 1) * 100;
      const xpToNextLevel = nextLevel - updatedUser.experience;

      message += `\n📊 Stats:`;
      message += `\n🎯 XP total: ${updatedUser.experience}`;
      message += `\n📈 Nivel: ${currentLevel}`;
      message += `\n🎮 XP para subir: ${xpToNextLevel}`;

      if (operation === 'add') {
        const previousLevel = Math.floor(
          (updatedUser.experience - amount) / 100,
        );
        if (currentLevel > previousLevel) {
          message += `\n🎉 ¡Subiste al nivel ${currentLevel}!`;
        }
      }

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: message },
      };
    } catch (error) {
      console.error('Error al procesar operación de experiencia:', error);
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: '❌ Error al procesar la operación de experiencia.',
        },
      };
    }
  }

  async getUserExperience(userId: string) {
    try {
      const user = await this.findOne(userId);
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: `🌟 ${user.username} tiene ${user.experience} puntos de experiencia.`,
        },
      };
    } catch (error) {
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: '❌ No se encontró la info del usuario.' },
      };
    }
  }

  async findTopByExperience(limit = 10): Promise<UserDiscord[]> {
    return this.userDiscordRepository
      .createQueryBuilder('user')
      .orderBy('user.experience', 'DESC')
      .limit(limit)
      .getMany();
  }

  async getTopExperienceRanking(): Promise<DiscordCommandResponse> {
    try {
      const users = await this.findTopByExperience(10);
      if (!users.length) {
        return {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: { content: 'No hay usuarios con experiencia registrada.' },
        };
      }
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
        data: { content: '❌ Error al obtener el ranking de experiencia.' },
      };
    }
  }
}
