import { Injectable } from '@nestjs/common';
import {
  InteractionResponseType,
  APIChatInputApplicationCommandInteractionData,
  APIApplicationCommandInteractionDataUserOption,
  APIApplicationCommandInteractionDataStringOption,
} from 'discord.js';
import { InfractionType } from '../../user-discord/entities/user-discord.entity';
import { UserDiscordService } from '../../user-discord/user-discord.service';
import { createErrorResponse } from '../discord-responses.util';
import { DiscordInteractionResponse } from '../discord.types';
import { KardexService } from 'src/kardex/kardex.service';

@Injectable()
export class DiscordInfractionService {
  constructor(
    private readonly userDiscordService: UserDiscordService,
    private readonly kardexService: KardexService,
  ) {}

  async handleAddInfraction(
    commandData: APIChatInputApplicationCommandInteractionData,
  ): Promise<DiscordInteractionResponse> {
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
      return createErrorResponse(
        'Faltan parámetros requeridos para la sanción.',
      );
    }

    const userId = userOption.value;
    const infractionType = typeOption.value as InfractionType;
    const reason = reasonOption.value;

    const resolvedUser = commandData.resolved?.users?.[userId];
    const resolvedMember = commandData.resolved?.members?.[userId];

    if (!resolvedUser || !resolvedMember) {
      return createErrorResponse(
        'No se pudo encontrar al usuario especificado.',
      );
    }

    const points = this.getInfractionPoints(infractionType);
    const emoji = this.getInfractionEmoji(infractionType);

    try {
      const user = await this.userDiscordService.findOrCreate({
        id: userId,
        username: resolvedUser.username,
        roles: resolvedMember.roles || [],
      });

      const coinsPenalti = points * 10;
      await this.userDiscordService.addPenaltyPoints(user.id, points);
      await this.kardexService.removeCoins(user.id, coinsPenalti, reason);

      const pointsUpdated = await this.userDiscordService.findOne(user.id);

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content:
            `${emoji} Sanción registrada - <@${userId}>\n` +
            `Tipo: ${infractionType}\n` +
            `Puntos: +${points}\n` +
            `Saldo: -${coinsPenalti}\n` +
            `Razón: ${reason}\n` +
            `Total acumulado: ${pointsUpdated}/10 puntos`,
        },
      };
    } catch (error) {
      console.error('Error al aplicar sanción:', error);
      return createErrorResponse('Error al procesar la sanción.');
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
}
