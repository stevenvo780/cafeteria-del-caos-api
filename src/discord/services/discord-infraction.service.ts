import { Injectable } from '@nestjs/common';
import {
  InteractionResponseType,
  APIChatInputApplicationCommandInteractionData,
  APIApplicationCommandInteractionDataUserOption,
  APIApplicationCommandInteractionDataStringOption,
} from 'discord.js';
import { InfractionType } from '../../user-discord/entities/user-discord.entity';
import { UserDiscordService } from '../../user-discord/user-discord.service';
import { ErrorResponse } from '../discord.types';

@Injectable()
export class DiscordInfractionService {
  constructor(private readonly userDiscordService: UserDiscordService) {}

  async handleAddInfraction(
    commandData: APIChatInputApplicationCommandInteractionData,
  ) {
    const userOption = commandData.options?.find(
      (opt) => opt.name === 'usuario',
    ) as APIApplicationCommandInteractionDataUserOption;

    const typeOption = commandData.options?.find(
      (opt) => opt.name === 'tipo',
    ) as APIApplicationCommandInteractionDataStringOption;

    const reasonOption = commandData.options?.find(
      (opt) => opt.name === 'razon',
    ) as APIApplicationCommandInteractionDataStringOption;

    if (!userOption || !typeOption || !reasonOption) {
      return this.errorResponse(
        'Faltan parámetros requeridos para la sanción.',
      );
    }

    const userId = userOption.value;
    const infractionType = typeOption.value as InfractionType;
    const reason = reasonOption.value;

    const resolvedUser = commandData.resolved?.users?.[userId];
    const resolvedMember = commandData.resolved?.members?.[userId];

    if (!resolvedUser || !resolvedMember) {
      return this.errorResponse(
        'No se pudo encontrar al usuario especificado.',
      );
    }

    const points = this.getInfractionPoints(infractionType);
    const emoji = this.getInfractionEmoji(infractionType);

    try {
      await this.userDiscordService.addPenaltyPoints(userId, points);
      const user = await this.userDiscordService.findOne(userId);

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content:
            `${emoji} Sanción registrada - <@${userId}>\n` +
            `Tipo: ${infractionType}\n` +
            `Puntos: +${points}\n` +
            `Razón: ${reason}\n` +
            `Total acumulado: ${user.points} puntos`,
        },
      };
    } catch (error) {
      console.error('Error al aplicar sanción:', error);
      return this.errorResponse('Error al procesar la sanción.');
    }
  }

  private getInfractionPoints(type: InfractionType): number {
    const pointsMap = {
      [InfractionType.BLACK]: 10,
      [InfractionType.RED]: 5,
      [InfractionType.ORANGE]: 3,
      [InfractionType.YELLOW]: 2,
    };
    return pointsMap[type] || 0;
  }

  private getInfractionEmoji(type: InfractionType): string {
    const emojiMap = {
      [InfractionType.BLACK]: '◼️',
      [InfractionType.RED]: '♦️',
      [InfractionType.ORANGE]: '🔶',
      [InfractionType.YELLOW]: '☢️',
    };
    return emojiMap[type] || '❓';
  }

  private errorResponse(message: string): ErrorResponse {
    return {
      type: InteractionResponseType.ChannelMessageWithSource as const,
      data: { content: message },
      isError: true,
    };
  }
}
