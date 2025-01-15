import { Injectable } from '@nestjs/common';
import {
  InteractionResponseType,
  APIChatInputApplicationCommandInteractionData,
  APIApplicationCommandInteractionDataStringOption,
} from 'discord.js';
import { InfractionType } from '../../user-discord/entities/user-discord.entity';
import { UserDiscordService } from '../../user-discord/user-discord.service';
import { createErrorResponse } from '../discord.util';
import { DiscordInteractionResponse } from '../discord.types';
import { KardexService } from 'src/kardex/kardex.service';

@Injectable()
export class DiscordInfractionService {
  constructor(
    private readonly userDiscordService: UserDiscordService,
    private readonly kardexService: KardexService,
  ) {}

  async handleInfractionCommand(
    commandName: string,
    commandData: APIChatInputApplicationCommandInteractionData,
  ): Promise<DiscordInteractionResponse> {
    switch (commandName) {
      case 'agregar-sancion':
        return await this.applyInfraction(commandData);
      default:
        return {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: { content: 'Comando de sanción no reconocido.' },
        };
    }
  }

  private async applyInfraction(
    commandData: APIChatInputApplicationCommandInteractionData,
  ): Promise<DiscordInteractionResponse> {
    const typeOption = commandData.options?.find(
      (opt) => opt.name === 'tipo',
    ) as APIApplicationCommandInteractionDataStringOption;
    const reasonOption = commandData.options?.find(
      (opt) => opt.name === 'razon',
    ) as APIApplicationCommandInteractionDataStringOption;
    if (!typeOption || !reasonOption) {
      return createErrorResponse('Faltan parámetros para la sanción.');
    }

    const user = await this.userDiscordService.resolveInteractionUser(
      commandData,
      'usuario',
    );
    if (!user) {
      return createErrorResponse('Usuario no encontrado.');
    }

    const infractionType = typeOption.value as InfractionType;
    const reason = reasonOption.value;

    const points = this.getInfractionPoints(infractionType);
    const emoji = this.getInfractionEmoji(infractionType);

    try {
      await this.userDiscordService.addPenaltyPoints(user.id, points);

      const currentBalance = await this.kardexService.getUserLastBalance(
        user.id,
      );
      const newBalance = this.calculateCoinPenalty(points, currentBalance);
      const coinsLost = currentBalance - newBalance;

      if (coinsLost > 0) {
        await this.kardexService.setCoins(
          user.id,
          newBalance,
          `${infractionType} - ${reason}`,
        );
      }

      const userUpdated = await this.userDiscordService.findOne(user.id);

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content:
            `${emoji} Sanción registrada - <@${user.id}>\n` +
            `Tipo: ${infractionType}\n` +
            `Puntos de sanción: +${points}\n` +
            `Monedas perdidas: ${Math.floor(coinsLost)}\n` +
            `Razón: ${reason}\n` +
            `Total puntos: ${userUpdated.points}/10\n` +
            `Balance actual: ${Math.floor(newBalance)} monedas`,
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

  private calculateCoinPenalty(points: number, totalCoins: number): number {
    const suma = Math.floor(points * 10);
    const resta = Math.floor(100 / suma);
    const monedas = Math.floor(totalCoins - resta);
    return Math.max(0, monedas);
  }
}
