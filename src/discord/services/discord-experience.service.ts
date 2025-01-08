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
import {
  CommandResponse,
  DiscordInteractionResponse,
  InteractPoints,
  ValidateResult,
} from '../discord.types';
import { createErrorResponse } from '../discord-responses.util';

@Injectable()
export class DiscordExperienceService {
  constructor(private readonly userDiscordService: UserDiscordService) {}

  async handleExperienceCommand(
    commandName: string,
    commandData: APIChatInputApplicationCommandInteractionData,
    interaction: APIInteraction,
  ): Promise<DiscordInteractionResponse> {
    console.log('Processing experience command:', { commandName, interaction });
    const validation = await this.validateExperienceCommand(commandData);
    if ('isError' in validation) {
      return validation;
    }

    try {
      switch (commandName) {
        case 'dar-experiencia': {
          await this.userDiscordService.update(validation.user.id, {
            experience: (validation.user.experience || 0) + validation.points,
          });
          return {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: `✨ ${validation.user.username} ha ganado ${
                validation.points
              } puntos de experiencia!\nExperiencia total: ${
                (validation.user.experience || 0) + validation.points
              }`,
            },
          };
        }
        case 'quitar-experiencia': {
          const newExperience = Math.max(
            0,
            (validation.user.experience || 0) - validation.points,
          );
          await this.userDiscordService.update(validation.user.id, {
            experience: newExperience,
          });
          return {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: `📉 ${validation.user.username} ha perdido ${validation.points} puntos de experiencia.\nExperiencia restante: ${newExperience}`,
            },
          };
        }
        case 'establecer-experiencia': {
          const newExperience = Math.max(0, validation.points);
          await this.userDiscordService.update(validation.user.id, {
            experience: newExperience,
          });
          return {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: `⚡ La experiencia de ${validation.user.username} ha sido establecida a ${newExperience} puntos`,
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
  ): Promise<CommandResponse> {
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

  async handleTopExperienceRanking(): Promise<DiscordInteractionResponse> {
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
  ): Promise<ValidateResult<InteractPoints>> {
    const userOption = commandData.options?.find(
      (opt) => opt.name === 'usuario',
    ) as APIApplicationCommandInteractionDataUserOption;

    const amountOption = commandData.options?.find(
      (opt) => opt.name === 'cantidad',
    ) as APIApplicationCommandInteractionDataNumberOption;

    if (!userOption || !amountOption) {
      return createErrorResponse(
        '❌ Error: Faltan parámetros necesarios para la operación.',
      );
    }

    const userId = userOption.value;
    const points = amountOption.value;

    const resolvedUser = commandData.resolved?.users?.[userId] as APIUser;
    const resolvedMember = commandData.resolved?.members?.[
      userId
    ] as APIInteractionDataResolvedGuildMember;

    if (!resolvedUser || !resolvedMember) {
      return createErrorResponse(
        '❌ Error: No se pudo encontrar al usuario especificado.',
      );
    }

    try {
      const user = await this.userDiscordService.findOrCreate({
        id: userId,
        username: resolvedUser.username,
        roles: resolvedMember.roles || [],
      });

      return {
        user,
        points,
      };
    } catch (error) {
      console.error('Error al procesar usuario:', error);
      return createErrorResponse(
        '❌ Error al procesar el usuario: ' + error.message,
      );
    }
  }
}
