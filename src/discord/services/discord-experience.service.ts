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
    interactionPayload?: APIInteraction,
  ): Promise<DiscordInteractionResponse> {
    switch (commandName) {
      case 'experiencia':
        return await this.handleUserExperience(
          commandData,
          interactionPayload.member,
        );
      case 'top-experiencia':
        return await this.handleTopExperienceRanking();
      case 'dar-experiencia':
      case 'quitar-experiencia':
      case 'establecer-experiencia':
        return await this.handleExperienceModification(
          commandName,
          commandData,
          interactionPayload,
        );
      default:
        return createErrorResponse('Comando de experiencia no reconocido');
    }
  }

  private async handleExperienceModification(
    commandName: string,
    commandData: APIChatInputApplicationCommandInteractionData,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interaction: APIInteraction,
  ): Promise<DiscordInteractionResponse> {
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
    try {
      const userOption = commandData.options?.find(
        (opt) => opt.name === 'usuario',
      ) as APIApplicationCommandInteractionDataUserOption;

      let targetUserId: string;
      let targetUsername: string;

      if (userOption) {
        targetUserId = userOption.value;
        const resolvedUser = commandData.resolved?.users?.[targetUserId];
        if (!resolvedUser) {
          return createErrorResponse(
            'No se pudo encontrar al usuario especificado.',
          );
        }
        targetUsername = resolvedUser.username;
      } else {
        targetUserId = member.user.id;
        targetUsername = member.user.username;
      }

      const targetUser = await this.userDiscordService.findOne(targetUserId);
      if (!targetUser) {
        return createErrorResponse(
          'Usuario no encontrado en la base de datos.',
        );
      }

      const topUsers = await this.userDiscordService.findTopByExperience(10);
      const userRank = topUsers.findIndex((u) => u.id === targetUserId) + 1;
      const rankText =
        userRank > 0 && userRank <= 10
          ? `\n🏆 Ranking: #${userRank} en el top 10`
          : '';

      const message =
        targetUserId === member.user.id
          ? `✨ Tienes ${
              targetUser.experience || 0
            } puntos de experiencia!${rankText}`
          : `✨ ${targetUsername} tiene ${
              targetUser.experience || 0
            } puntos de experiencia!${rankText}`;

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: message },
      };
    } catch (error) {
      console.error('Error al obtener experiencia:', error);
      return createErrorResponse(
        'Error al obtener la información de experiencia',
      );
    }
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
    const amountOption = commandData.options?.find(
      (opt) => opt.name === 'cantidad',
    ) as APIApplicationCommandInteractionDataNumberOption;
    if (!amountOption) {
      return createErrorResponse('Faltan datos para experiencia.');
    }

    const user = await this.userDiscordService.resolveInteractionUser(
      commandData,
      'usuario',
    );
    if (!user) {
      return createErrorResponse('Usuario no encontrado.');
    }

    return {
      user,
      points: amountOption.value,
    };
  }
}
