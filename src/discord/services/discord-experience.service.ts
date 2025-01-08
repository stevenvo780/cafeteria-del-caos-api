import { Injectable } from '@nestjs/common';
import {
  InteractionResponseType,
  APIChatInputApplicationCommandInteractionData,
  APIInteraction,
  APIApplicationCommandInteractionDataUserOption,
  APIApplicationCommandInteractionDataNumberOption,
  APIUser,
  APIInteractionDataResolvedGuildMember,
} from 'discord.js';
import { UserDiscordService } from '../../user-discord/user-discord.service';
import { InteractPoints } from '../discord.types';

@Injectable()
export class DiscordExperienceService {
  constructor(private readonly userDiscordService: UserDiscordService) {}

  async handleExperienceCommand(
    commandName: string,
    commandData: APIChatInputApplicationCommandInteractionData,
    interaction: APIInteraction,
  ) {
    console.log('Processing experience command:', { commandName, interaction });
    const validation = await this.validateExperienceCommand(commandData);
    if ('error' in validation) {
      return validation.error;
    }

    try {
      const user = await this.userDiscordService.findOne(validation.userId);

      switch (commandName) {
        case 'dar-experiencia': {
          await this.userDiscordService.update(validation.userId, {
            experience: (user.experience || 0) + validation.points,
          });
          return {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: `✨ ${user.username} ha ganado ${
                validation.points
              } puntos de experiencia!\nExperiencia total: ${
                (user.experience || 0) + validation.points
              }`,
            },
          };
        }
        case 'quitar-experiencia': {
          const newExperience = Math.max(
            0,
            (user.experience || 0) - validation.points,
          );
          await this.userDiscordService.update(validation.userId, {
            experience: newExperience,
          });
          return {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: `📉 ${user.username} ha perdido ${validation.points} puntos de experiencia.\nExperiencia restante: ${newExperience}`,
            },
          };
        }
        case 'establecer-experiencia': {
          const newExperience = Math.max(0, validation.points);
          await this.userDiscordService.update(validation.userId, {
            experience: newExperience,
          });
          return {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: `⚡ La experiencia de ${user.username} ha sido establecida a ${newExperience} puntos`,
            },
          };
        }
        default:
          return {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: { content: 'Comando de experiencia no reconocido' },
          };
      }
    } catch (error) {
      console.error('Error al procesar comando de experiencia:', error);
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: '❌ Error al procesar el comando de experiencia' },
      };
    }
  }

  async handleUserExperience(
    commandData: APIChatInputApplicationCommandInteractionData,
    member: any,
  ) {
    const userOption = commandData.options?.find(
      (opt) => opt.name === 'usuario',
    ) as any;

    const targetUser = userOption
      ? await this.userDiscordService.findOne(userOption.value)
      : await this.userDiscordService.findOne(member.user.id);

    if (!targetUser) {
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: '❌ Error: Usuario no encontrado' },
      };
    }

    const topUsers = await this.userDiscordService.findTopByExperience(10);
    const userRank = topUsers.findIndex((u) => u.id === targetUser.id) + 1;
    const rankText =
      userRank > 0 && userRank <= 10
        ? `\n🏆 Ranking: #${userRank} en el top 10`
        : '';

    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: `✨ ${targetUser.username} tiene ${targetUser.experience} puntos de experiencia!${rankText}`,
      },
    };
  }

  async handleTopExperienceRanking() {
    try {
      const topUsers = await this.userDiscordService.findTopByExperience(10);
      if (!topUsers || topUsers.length === 0) {
        return {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: { content: 'No hay usuarios con experiencia registrada.' },
        };
      }

      const response = ['✨ Top 10 usuarios con más experiencia:']
        .concat(
          topUsers.map((u, i) => {
            const medal =
              i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '✨';
            return `${medal} #${i + 1} ${u.username} - ${u.experience} XP`;
          }),
        )
        .join('\n');

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: response },
      };
    } catch (error) {
      console.error('Error al obtener ranking de experiencia:', error);
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: '❌ Error al obtener el ranking de experiencia.' },
      };
    }
  }

  private async validateExperienceCommand(
    commandData: APIChatInputApplicationCommandInteractionData,
  ): Promise<InteractPoints | { error: any }> {
    const userOption = commandData.options?.find(
      (opt) => opt.name === 'usuario',
    ) as APIApplicationCommandInteractionDataUserOption;

    const amountOption = commandData.options?.find(
      (opt) => opt.name === 'cantidad',
    ) as APIApplicationCommandInteractionDataNumberOption;

    if (!userOption || !amountOption) {
      return {
        error: {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content:
              '❌ Error: Faltan parámetros necesarios para la operación.',
          },
        },
      };
    }

    const userId = userOption.value;
    const points = amountOption.value;

    const resolvedUser = commandData.resolved?.users?.[userId] as APIUser;
    const resolvedMember = commandData.resolved?.members?.[
      userId
    ] as APIInteractionDataResolvedGuildMember;

    if (!resolvedUser || !resolvedMember) {
      return {
        error: {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: '❌ Error: No se pudo encontrar al usuario especificado.',
          },
        },
      };
    }

    try {
      await this.userDiscordService.findOrCreate({
        id: userId,
        username: resolvedUser.username,
        roles: resolvedMember.roles || [],
      });

      return {
        userId,
        points,
        username: resolvedUser.username,
        roles: resolvedMember.roles || [],
      };
    } catch (error) {
      console.error('Error al procesar usuario:', error);
      return {
        error: {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: '❌ Error al procesar el usuario: ' + error.message,
          },
        },
      };
    }
  }
}
