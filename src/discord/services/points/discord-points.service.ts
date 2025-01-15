import { Injectable } from '@nestjs/common';
import {
  InteractionResponseType,
  APIChatInputApplicationCommandInteractionData,
  APIInteraction,
  APIApplicationCommandInteractionDataNumberOption,
  APIApplicationCommandInteractionDataUserOption,
} from 'discord.js';
import { UserDiscordService } from '../../../user-discord/user-discord.service';
import {
  CommandResponse,
  DiscordInteractionResponse,
  InteractPoints,
  ValidateResult,
} from '../../discord.types';
import { createErrorResponse, resolveTargetUser } from '../../discord.util';
import { PointsCommands } from './types';

@Injectable()
export class DiscordPointsService {
  constructor(private readonly userDiscordService: UserDiscordService) {}

  async handlePointsCommand(
    commandName: string,
    commandData: APIChatInputApplicationCommandInteractionData,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interactionPayload?: APIInteraction,
  ): Promise<DiscordInteractionResponse> {
    const validation = await this.validatePointsCommand(commandData);
    if ('isError' in validation) {
      return validation;
    }

    switch (commandName) {
      case PointsCommands.GET_POINTS:
        return await this.handleUserScore(
          commandData,
          interactionPayload.member,
        );
      case PointsCommands.ADD_POINTS:
        return await this.userDiscordService.handleAddPoints(validation);
      case PointsCommands.REMOVE_POINTS:
        return await this.userDiscordService.handleRemovePoints(validation);
      case PointsCommands.SET_POINTS:
        return await this.userDiscordService.handleSetPoints(validation);
      default:
        return createErrorResponse('Comando de puntos no reconocido');
    }
  }

  private async validatePointsCommand(
    commandData: APIChatInputApplicationCommandInteractionData,
  ): Promise<ValidateResult<InteractPoints>> {
    const pointsOption = commandData.options?.find(
      (opt) => opt.name === 'puntos',
    ) as APIApplicationCommandInteractionDataNumberOption;
    if (!pointsOption) {
      return createErrorResponse('Faltan datos para puntos.');
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
      points: pointsOption.value,
    };
  }

  async handleUserScore(
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

      const userPoints = targetUser.points || 0;
      const message = userOption
        ? `El puntaje de ${targetUser.username} es: ${userPoints} puntos.`
        : `Tu puntaje actual es: ${userPoints} puntos.`;

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: message },
      };
    } catch (error) {
      return createErrorResponse('Error al obtener el puntaje');
    }
  }
}
