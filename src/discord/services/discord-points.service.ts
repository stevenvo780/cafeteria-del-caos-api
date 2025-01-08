import { Injectable } from '@nestjs/common';
import {
  InteractionResponseType,
  APIChatInputApplicationCommandInteractionData,
  APIApplicationCommandInteractionDataNumberOption,
  APIApplicationCommandInteractionDataUserOption,
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
export class DiscordPointsService {
  constructor(private readonly userDiscordService: UserDiscordService) {}

  async handleUserPoints(
    commandName: string,
    commandData: APIChatInputApplicationCommandInteractionData,
  ): Promise<DiscordInteractionResponse> {
    const validation = await this.validatePointsCommand(commandData);
    if ('isError' in validation) {
      return validation;
    }

    switch (commandName) {
      case 'añadir-puntos':
        return await this.userDiscordService.handleAddPoints(validation);
      case 'quitar-puntos':
        return await this.userDiscordService.handleRemovePoints(validation);
      case 'establecer-puntos':
        return await this.userDiscordService.handleSetPoints(validation);
      case 'puntaje':
        return await this.handleUserScore(commandData, validation);
      default:
        return {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: { content: 'Comando de puntos no reconocido' },
        };
    }
  }

  private async validatePointsCommand(
    commandData: APIChatInputApplicationCommandInteractionData,
  ): Promise<ValidateResult<InteractPoints>> {
    const userOption = commandData.options?.find(
      (opt) => opt.name === 'usuario',
    ) as APIApplicationCommandInteractionDataUserOption;

    const pointsOption = commandData.options?.find(
      (opt) => opt.name === 'puntos',
    ) as APIApplicationCommandInteractionDataNumberOption;

    if (!userOption || !pointsOption) {
      return createErrorResponse(
        'La estupidez humana se manifiesta... ¿Dónde están los datos fundamentales?',
      );
    }

    const userId = userOption.value;
    const points = pointsOption.value;

    const resolvedUser = commandData.resolved?.users?.[userId] as APIUser;
    const resolvedMember = commandData.resolved?.members?.[
      userId
    ] as APIInteractionDataResolvedGuildMember;
    if (!resolvedUser || !resolvedMember) {
      return createErrorResponse(
        '¡NO ENCUENTRO A ESE USUARIO, PEDAZO DE ALCORNOQUE!',
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
      console.error('Error al procesar usuario objetivo:', error);
      return createErrorResponse(
        'Error al procesar usuario objetivo: ' + error.message,
      );
    }
  }

  async handleUserScore(
    commandData: APIChatInputApplicationCommandInteractionData,
    member: any,
  ): Promise<CommandResponse> {
    const userId = member.user.id;
    try {
      const user = await this.userDiscordService.findOne(userId);
      const userPoints = user.points || 0;
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: `Tu puntaje actual es: ${userPoints} puntos.`,
        },
      };
    } catch (error) {
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: 'Error al obtener tu puntaje' },
      };
    }
  }
}
