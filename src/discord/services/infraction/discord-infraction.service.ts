import { Injectable } from '@nestjs/common';
import {
  InteractionResponseType,
  APIChatInputApplicationCommandInteractionData,
  APIApplicationCommandInteractionDataStringOption,
} from 'discord.js';
import { UserDiscordService } from '../../../user-discord/user-discord.service';
import { createErrorResponse } from '../../discord.util';
import { DiscordInteractionResponse } from '../../discord.types';
import { KardexService } from 'src/kardex/kardex.service';
import { InfractionCommands } from './types';
import { ConfigService } from 'src/config/config.service';

@Injectable()
export class DiscordInfractionService {
  constructor(
    private readonly userDiscordService: UserDiscordService,
    private readonly kardexService: KardexService,
    private readonly configService: ConfigService,
  ) {}

  async handleInfractionCommand(
    commandName: string,
    commandData: APIChatInputApplicationCommandInteractionData,
  ): Promise<DiscordInteractionResponse> {
    switch (commandName) {
      case InfractionCommands.ADD_INFRACTION:
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

    const infractionValue = typeOption.value;
    const reason = reasonOption.value;

    const config = await this.configService.getConfig();
    const infractionConfig = config.infractions.find(
      (inf) => inf.value === infractionValue,
    );

    if (!infractionConfig) {
      return createErrorResponse('Tipo de sanción no válido.');
    }

    try {
      await this.userDiscordService.addPenaltyPoints(user.id, infractionConfig.points);

      const currentBalance = await this.kardexService.getUserLastBalance(user.id);
      const newBalance = this.calculateCoinPenalty(infractionConfig.points, currentBalance);
      const coinsLost = currentBalance - newBalance;

      if (coinsLost > 0) {
        await this.kardexService.setCoins(
          user.id,
          newBalance,
          `${infractionConfig.name} - ${reason}`,
        );
      }

      const userUpdated = await this.userDiscordService.findOne(user.id);

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content:
            `${infractionConfig.emoji} Sanción registrada - <@${user.id}>\n` +
            `Tipo: ${infractionConfig.name}\n` +
            `Puntos de sanción: +${infractionConfig.points}\n` +
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

  private calculateCoinPenalty(points: number, totalCoins: number): number {
    const suma = Math.floor(points * 10);
    const resta = Math.floor(100 / suma);
    const monedas = Math.floor(totalCoins - resta);
    return Math.max(0, monedas);
  }
}
