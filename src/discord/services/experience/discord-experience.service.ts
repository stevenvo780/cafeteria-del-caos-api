import { Injectable } from '@nestjs/common';
import {
  InteractionResponseType,
  APIChatInputApplicationCommandInteractionData,
  APIInteraction,
  APIApplicationCommandInteractionDataUserOption,
  APIApplicationCommandInteractionDataNumberOption,
} from 'discord.js';
import { UserDiscordService } from '../../../user-discord/user-discord.service';
import {
  CommandResponse,
  DiscordInteractionResponse,
  InteractPoints,
  ValidateResult,
} from '../../discord.types';
import { createErrorResponse, resolveTargetUser } from '../../discord.util';
import { ExperienceCommands } from './types';

@Injectable()
export class DiscordExperienceService {
  constructor(private readonly userDiscordService: UserDiscordService) {}

  async handleExperienceCommand(
    commandName: string,
    commandData: APIChatInputApplicationCommandInteractionData,
    interactionPayload?: APIInteraction,
  ): Promise<DiscordInteractionResponse> {
    switch (commandName) {
      case ExperienceCommands.GET_EXPERIENCE:
        return await this.handleUserExperience(
          commandData,
          interactionPayload.member,
        );
      case ExperienceCommands.TOP_EXPERIENCE:
        return await this.handleTopExperienceRanking();
      case ExperienceCommands.GIVE_EXPERIENCE:
        return await this.handleExperienceModification('dar', commandData);
      case ExperienceCommands.REMOVE_EXPERIENCE:
        return await this.handleExperienceModification('quitar', commandData);
      case ExperienceCommands.SET_EXPERIENCE:
        return await this.handleExperienceModification(
          'establecer',
          commandData,
        );
      default:
        return createErrorResponse('Comando de experiencia no reconocido');
    }
  }

  private async handleExperienceModification(
    action: 'dar' | 'quitar' | 'establecer',
    commandData: APIChatInputApplicationCommandInteractionData,
  ): Promise<DiscordInteractionResponse> {
    const validation = await this.validateExperienceCommand(commandData);
    if ('isError' in validation) {
      return validation;
    }

    try {
      switch (action) {
        case 'dar': {
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
        case 'quitar': {
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
        case 'establecer': {
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

      const targetUser = await resolveTargetUser(
        this.userDiscordService,
        userOption,
        commandData,
        member,
      );

      if ('isError' in targetUser) {
        return targetUser;
      }

      const topUsers = await this.userDiscordService.findTopByExperience(10);
      const userRank = topUsers.findIndex((u) => u.id === targetUser.id) + 1;
      const rankText =
        userRank > 0 && userRank <= 10
          ? `\n🏆 Ranking: #${userRank} en el top 10`
          : '';

      const message = userOption
        ? `✨ ${targetUser.username} tiene ${
            targetUser.experience || 0
          } puntos de experiencia!${rankText}`
        : `✨ Tienes ${
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
