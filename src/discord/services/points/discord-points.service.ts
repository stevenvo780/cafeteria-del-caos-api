import { Injectable } from '@nestjs/common';
import {
  InteractionResponseType,
  APIChatInputApplicationCommandInteractionData,
  APIInteraction,
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
import { PointsCommands, POINTS_OPTION } from './types';
import { USER_OPTION } from '../base-command-options';

@Injectable()
export class DiscordPointsService {
  constructor(private readonly userDiscordService: UserDiscordService) {}

  async handlePointsCommand(
    commandName: string,
    commandData: APIChatInputApplicationCommandInteractionData,
    interactionPayload?: APIInteraction,
  ): Promise<DiscordInteractionResponse> {
    try {
      switch (commandName) {
        case PointsCommands.GET_POINTS:
          return await this.handleGetPoints(commandData, interactionPayload);
        case PointsCommands.ADD_POINTS:
          return await this.handleAddPoints(commandData);
        case PointsCommands.REMOVE_POINTS:
          return await this.handleRemovePoints(commandData);
        case PointsCommands.SET_POINTS:
          return await this.handleSetPoints(commandData);
        default:
          return createErrorResponse('Comando de puntos no reconocido');
      }
    } catch (error) {
      console.error(`Error en comando ${commandName}:`, error);
      return createErrorResponse('❌ Error al procesar el comando');
    }
  }

  private async handleGetPoints(
    commandData: APIChatInputApplicationCommandInteractionData,
    interactionPayload: APIInteraction,
  ): Promise<DiscordInteractionResponse> {
    const userOption = commandData.options?.find(
      (opt) => opt.name === USER_OPTION.name,
    );
    const targetUser = await resolveTargetUser(
      this.userDiscordService,
      userOption,
      commandData,
      interactionPayload.member,
    );

    if ('isError' in targetUser) {
      return createErrorResponse('❌ Usuario no encontrado');
    }

    const userPoints = targetUser.points || 0;
    const message = userOption
      ? `El puntaje de ${targetUser.username} es: ${userPoints} puntos.`
      : `Tu puntaje actual es: ${userPoints} puntos.`;

    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: { content: message },
    };
  }

  private async handleAddPoints(
    commandData: APIChatInputApplicationCommandInteractionData,
  ): Promise<DiscordInteractionResponse> {
    const validation = await this.validatePointsCommand(commandData);
    if ('isError' in validation) return validation;

    try {
      await this.userDiscordService.update(validation.user.id, {
        points: (validation.user.points || 0) + validation.points,
      });

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: `✨ ${validation.user.username} ha recibido ${validation.points} puntos`,
        },
      };
    } catch (error) {
      console.error('Error al añadir puntos:', error);
      return createErrorResponse('❌ Error al añadir puntos');
    }
  }

  private async handleRemovePoints(
    commandData: APIChatInputApplicationCommandInteractionData,
  ): Promise<DiscordInteractionResponse> {
    const validation = await this.validatePointsCommand(commandData);
    if ('isError' in validation) return validation;

    try {
      const newPoints = Math.max(0, (validation.user.points || 0) - validation.points);
      await this.userDiscordService.update(validation.user.id, { points: newPoints });

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: `📉 Se han removido ${validation.points} puntos de ${validation.user.username}`,
        },
      };
    } catch (error) {
      console.error('Error al quitar puntos:', error);
      return createErrorResponse('❌ Error al quitar puntos');
    }
  }

  private async handleSetPoints(
    commandData: APIChatInputApplicationCommandInteractionData,
  ): Promise<DiscordInteractionResponse> {
    const validation = await this.validatePointsCommand(commandData);
    if ('isError' in validation) return validation;

    try {
      await this.userDiscordService.update(validation.user.id, {
        points: validation.points,
      });

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: `⚡ Puntos de ${validation.user.username} establecidos a ${validation.points}`,
        },
      };
    } catch (error) {
      console.error('Error al establecer puntos:', error);
      return createErrorResponse('❌ Error al establecer puntos');
    }
  }

  private async validatePointsCommand(
    commandData: APIChatInputApplicationCommandInteractionData,
  ): Promise<ValidateResult<InteractPoints>> {
    const pointsOption = commandData.options?.find(
      (opt) => opt.name === POINTS_OPTION.name,
    ) as APIApplicationCommandInteractionDataNumberOption;
    if (!pointsOption) {
      return createErrorResponse('Faltan datos para puntos.');
    }

    const user = await this.userDiscordService.resolveInteractionUser(
      commandData,
      USER_OPTION.name,
    );
    if (!user) {
      return createErrorResponse('Usuario no encontrado.');
    }

    return {
      user,
      points: pointsOption.value,
    };
  }
}
