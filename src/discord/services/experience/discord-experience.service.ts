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
  InteractExperience,
  ValidateResult,
} from '../../discord.types';
import { createErrorResponse, resolveTargetUser } from '../../discord.util';
import { ExperienceCommands, EXPERIENCE_OPTION } from './types';
import { USER_OPTION } from '../base-command-options';

@Injectable()
export class DiscordExperienceService {
  constructor(private readonly userDiscordService: UserDiscordService) { }

  async handleExperienceCommand(
    commandName: string,
    commandData: APIChatInputApplicationCommandInteractionData,
    interactionPayload?: APIInteraction,
  ): Promise<DiscordInteractionResponse> {
    try {
      switch (commandName) {
        case ExperienceCommands.GET_EXPERIENCE:
          return await this.handleUserExperience(commandData, interactionPayload.member);
        case ExperienceCommands.TOP_EXPERIENCE:
          return await this.handleTopExperienceRanking();
        case ExperienceCommands.GIVE_EXPERIENCE:
          return await this.handleGiveExperience(commandData);
        case ExperienceCommands.REMOVE_EXPERIENCE:
          return await this.handleRemoveExperience(commandData);
        case ExperienceCommands.SET_EXPERIENCE:
          return await this.handleSetExperience(commandData);
        default:
          return createErrorResponse('Comando de experiencia no reconocido');
      }
    } catch (error) {
      console.error(`Error en comando ${commandName}:`, error);
      return createErrorResponse('❌ Error al procesar el comando');
    }
  }

  private async handleGiveExperience(
    commandData: APIChatInputApplicationCommandInteractionData,
  ): Promise<DiscordInteractionResponse> {
    const validation = await this.validateExperienceCommand(commandData);
    if ('isError' in validation) return validation;

    try {
      const newExperience = (validation.user.experience || 0) + validation.experience;
      await this.userDiscordService.updateExperience(validation.user.id, newExperience);

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: `✨ ${validation.user.username} ha ganado ${validation.experience} puntos de experiencia!\nExperiencia total: ${newExperience}`,
        },
      };
    } catch (error) {
      console.error('Error al dar experiencia:', error);
      return createErrorResponse('❌ Error al dar experiencia.');
    }
  }

  private async handleRemoveExperience(
    commandData: APIChatInputApplicationCommandInteractionData,
  ): Promise<DiscordInteractionResponse> {
    const validation = await this.validateExperienceCommand(commandData);
    if ('isError' in validation) return validation;

    try {
      const newExperience = Math.max(0, (validation.user.experience || 0) - validation.experience);
      await this.userDiscordService.updateExperience(validation.user.id, newExperience);

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: `📉 ${validation.user.username} ha perdido ${validation.experience} puntos de experiencia.\nExperiencia restante: ${newExperience}`,
        },
      };
    } catch (error) {
      console.error('Error al quitar experiencia:', error);
      return createErrorResponse('❌ Error al quitar experiencia.');
    }
  }

  private async handleSetExperience(
    commandData: APIChatInputApplicationCommandInteractionData,
  ): Promise<DiscordInteractionResponse> {
    const validation = await this.validateExperienceCommand(commandData);
    if ('isError' in validation) return validation;

    try {
      const newExperience = Math.max(0, validation.experience);
      await this.userDiscordService.updateExperience(validation.user.id, newExperience);

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: `⚡ La experiencia de ${validation.user.username} ha sido establecida a ${newExperience} puntos`,
        },
      };
    } catch (error) {
      console.error('Error al establecer experiencia:', error);
      return createErrorResponse('❌ Error al establecer experiencia.');
    }
  }

  async handleUserExperience(
    commandData: APIChatInputApplicationCommandInteractionData,
    member: any,
  ): Promise<CommandResponse> {
    try {
      const userOption = commandData.options?.find(
        (opt) => opt.name === USER_OPTION.name,
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
        ? `✨ ${targetUser.username} tiene ${targetUser.experience || 0
        } puntos de experiencia!${rankText}`
        : `✨ Tienes ${targetUser.experience || 0
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
  ): Promise<ValidateResult<InteractExperience>> {
    const amountOption = commandData.options?.find(
      (opt) => opt.name === EXPERIENCE_OPTION.name,
    ) as APIApplicationCommandInteractionDataNumberOption;
    if (!amountOption) {
      return createErrorResponse('Faltan datos para experiencia.');
    }

    const user = await this.userDiscordService.resolveInteractionUser(
      commandData,
    );
    if (!user) {
      return createErrorResponse('Usuario no encontrado.');
    }

    return {
      user,
      experience: amountOption.value,
    };
  }
}
