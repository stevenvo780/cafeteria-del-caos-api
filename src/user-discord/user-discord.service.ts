import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, UpdateResult } from 'typeorm';
import { UserDiscord } from './entities/user-discord.entity';
import { FindUsersDto, SortOrder } from './dto/find-users.dto';
import {
  APIChatInputApplicationCommandInteractionData,
  ApplicationCommandOptionType,
} from 'discord.js';
import { CreateUserDiscordDto } from './dto/create-user-discord.dto';
import { UpdateUserDiscordDto } from './dto/update-user-discord.dto';
import { KardexService } from '../kardex/kardex.service';
import { USER_OPTION } from 'src/discord/services/base-command-options';
import { ConfigService } from '../config/config.service';
import { getDiscordClient } from '../utils/discord-utils';

@Injectable()
export class UserDiscordService {
  constructor(
    @InjectRepository(UserDiscord)
    private readonly userDiscordRepository: Repository<UserDiscord>,
    private kardexService: KardexService,
    private readonly configService: ConfigService,
  ) { }

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
    const updatedUser = {
      ...user,
      ...updateUserDiscordDto,
    };
    if (updateUserDiscordDto.coins) {
      await this.kardexService.setCoins(id, updateUserDiscordDto.coins);
    }
    if (updateUserDiscordDto.experience) {
      await this.assignXpRoleIfNeeded(updatedUser);
    }
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
    const newPoints = user.points + points;
    return this.userDiscordRepository.update(id, { points: newPoints });
  }

  async updatePoints(id: string, points: number): Promise<UserDiscord> {
    const user = await this.findOne(id);
    user.points = points;
    const updateUser = this.userDiscordRepository.save(user);
    return updateUser;
  }

  async addExperience(userId: string, amount: number): Promise<UserDiscord> {
    const user = await this.findOne(userId);
    const updatedExperience = Math.max(0, (user.experience || 0) + amount);
    user.experience = updatedExperience;
    const updatedUser = await this.userDiscordRepository.save(user);
    await this.assignXpRoleIfNeeded(updatedUser);
    return updatedUser;
  }

  async updateExperience(
    id: string,
    experience: number,
  ): Promise<UserDiscord> {
    const user = await this.findOne(id);
    user.experience = Math.max(0, experience);
    const updatedUser = await this.userDiscordRepository.save(user);
    await this.assignXpRoleIfNeeded(updatedUser);
    return updatedUser;
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

  async findTopByExperience(limit = 10): Promise<UserDiscord[]> {
    return this.userDiscordRepository
      .createQueryBuilder('user')
      .orderBy('user.experience', 'DESC')
      .limit(limit)
      .getMany();
  }

  async resolveInteractionUser(
    commandData: APIChatInputApplicationCommandInteractionData,
  ): Promise<UserDiscord | null> {
    const subcommand = commandData.options?.[0]?.type === 1
      ? commandData.options[0]
      : undefined;

    let userOption =
      subcommand?.options?.find((opt) => opt.name === USER_OPTION.name) ||
      commandData.options?.find((opt) => opt.name === USER_OPTION.name);

    if (
      userOption?.type === ApplicationCommandOptionType.User &&
      userOption.value &&
      commandData.resolved?.users &&
      commandData.resolved.members
    ) {
      const resolvedUser = commandData.resolved.users[userOption.value];
      const resolvedMember = commandData.resolved.members[userOption.value];
      if (resolvedUser && resolvedMember) {
        return await this.findOrCreate({
          id: userOption.value,
          username: resolvedUser.username,
          roles: resolvedMember.roles || [],
        });
      }
    }

    return null;
  }

  async assignXpRoleIfNeeded(user: UserDiscord): Promise<void> {
    try {
      const client = await getDiscordClient();
      const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID);
      if (!guild) throw new Error('No se pudo obtener el servidor de Discord');
  
      const member = await guild.members.fetch(user.id);
      if (!member) throw new Error('No se pudo obtener el miembro del servidor');
  
      const xpRoles = await this.configService.getXpRoles();
      if (!xpRoles?.length) return;
  
      const sortedRoles = xpRoles.sort((a, b) => b.requiredXp - a.requiredXp);
  
      const currentRole = sortedRoles.find(role => user.experience >= role.requiredXp);
      if (!currentRole) return;
  
      const discordRole = await guild.roles.fetch(currentRole.roleId);
      if (!discordRole) {
        console.error(`El rol ${currentRole.roleId} no existe en el servidor`);
        return;
      }
  
      const previousXpRoles = member.roles.cache.filter(role =>
        xpRoles.some(xpRole => {
          const roleExists = guild.roles.cache.has(xpRole.roleId);
          if (!roleExists) {
            console.error(`El rol ${xpRole.roleId} no existe en el servidor`);
            return false;
          }
          return xpRole.roleId === role.id && xpRole.roleId !== currentRole.roleId;
        })
      );
  
      const hasPreviousRole = member.roles.cache.has(currentRole.roleId);
      if (!hasPreviousRole) {
        try {
          await Promise.all(
            previousXpRoles.map(role => member.roles.remove(role))
          );
  
          await member.roles.add(currentRole.roleId);
  
          const config = await this.configService.getFirebaseConfig();
          const rewardChannelId = config.channels.rewardChannelId;
          const rewardChannel = guild.channels.cache.get(rewardChannelId);
          if (rewardChannel && rewardChannel.isTextBased()) {
            await rewardChannel.send(
              `🎉 ¡Felicidades <@${user.id}>! Has subido de nivel y ahora tienes el rol <@&${currentRole.roleId}>.`
            );
          }
        } catch (roleError) {
          console.error('Error al modificar roles:', roleError);
          throw new Error('No se pudieron modificar los roles del usuario');
        }
      }
  
    } catch (error) {
      console.error('Error al asignar rol por XP:', error);
      throw new Error('No se pudo asignar el rol por XP');
    }
  }
}
