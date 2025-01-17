// discord-infraction.service.ts
import { Injectable } from '@nestjs/common'
import {
  InteractionResponseType,
  APIChatInputApplicationCommandInteractionData,
  APIApplicationCommandInteractionDataSubcommandOption,
  APIApplicationCommandInteractionDataNumberOption,
  APIApplicationCommandInteractionDataStringOption,
  ApplicationCommandOptionType,
  APIApplicationCommandInteractionDataOption
} from 'discord.js'
import { UserDiscordService } from '../../../user-discord/user-discord.service'
import { createErrorResponse } from '../../discord.util'
import { DiscordInteractionResponse } from '../../discord.types'
import { KardexService } from 'src/kardex/kardex.service'
import { ConfigService } from 'src/config/config.service'
import {
  InfractionCommands,
  INFRACTION_TYPE_OPTION,
  INFRACTION_REASON_OPTION,
  INFRACTION_ROLE_OPTION,
  INFRACTION_DURATION_OPTION,
} from './types'
import { USER_OPTION } from '../base-command-options'
import { getDiscordClient } from '../../../utils/discord-utils'

@Injectable()
export class DiscordInfractionService {
  constructor(
    private readonly userDiscordService: UserDiscordService,
    private readonly kardexService: KardexService,
    private readonly configService: ConfigService
  ) {}

  async handleInfractionCommand(
    commandName: string,
    commandData: APIChatInputApplicationCommandInteractionData
  ): Promise<DiscordInteractionResponse> {
    try {
      switch (commandName) {
        case InfractionCommands.ADD_INFRACTION:
          return this.handleAddInfraction(commandData)
        default:
          return createErrorResponse('Comando de sanción no reconocido')
      }
    } catch (error) {
      console.error(`Error en comando ${commandName}:`, error)
      return createErrorResponse('❌ Error al procesar el comando')
    }
  }

  private async handleAddInfraction(
    commandData: APIChatInputApplicationCommandInteractionData
  ): Promise<DiscordInteractionResponse> {
    try {
      const user = await this.userDiscordService.resolveInteractionUser(
        commandData,
      );

      if (!user) {
        return createErrorResponse('No se pudo encontrar al usuario.');
      }

      const typeOption = commandData.options?.find(
        opt => opt.name === INFRACTION_TYPE_OPTION.name
      ) as APIApplicationCommandInteractionDataStringOption;
      const reasonOption = commandData.options?.find(
        opt => opt.name === INFRACTION_REASON_OPTION.name
      ) as APIApplicationCommandInteractionDataStringOption;
  
      if (!typeOption?.value || !reasonOption?.value) {
        return createErrorResponse('Tipo de sanción y razón son obligatorios.');
      }
  
      const durationOption = commandData.options?.find(
        opt => opt.name === INFRACTION_DURATION_OPTION.name
      ) as APIApplicationCommandInteractionDataNumberOption | undefined;
      const roleOption = commandData.options?.find(
        opt => opt.name === INFRACTION_ROLE_OPTION.name
      ) as APIApplicationCommandInteractionDataStringOption | undefined;
  
      const config = await this.configService.getConfig();
      const infractionConfig = config.infractions.find(
        inf => inf.value === typeOption.value
      );

      if (!infractionConfig) {
        return createErrorResponse('Tipo de sanción no válido.');
      }
  
      const maxInfractionPoints = Math.max(...config.infractions.map(inf => inf.points));
  
      const client = await getDiscordClient();
      const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID!);
      const member = guild
        ? await guild.members.fetch(user.id).catch(() => null)
        : null;
  
      if (!member) {
        return createErrorResponse('No se pudo encontrar al usuario en el servidor.');
      }
  
      if (durationOption?.value) {
        const durationMs = Number(durationOption.value) * 60000;
        await member.timeout(durationMs, `Muteo: ${reasonOption.value}`);
      }
  
      if (roleOption?.value) {
        await member.roles.add(roleOption.value, `Sanción: ${reasonOption.value}`);
      }
  
      await this.userDiscordService.addPenaltyPoints(user.id, infractionConfig.points)
      const currentBalance = await this.kardexService.getUserLastBalance(user.id)
      
      const basePercentage = 0.05;
      const percentagePerPoint = 0.02;
      const totalPercentage = basePercentage + (percentagePerPoint * infractionConfig.points);
      
      const quitCoins = Math.floor(currentBalance * totalPercentage);
      
      const minPenaltyPercentage = 0.01;
      const maxPenaltyPercentage = 0.60;
      
      const absoluteMinimum = 10;
      const minPenalty = Math.max(
        absoluteMinimum,
        Math.floor(currentBalance * minPenaltyPercentage)
      );
      const maxPenalty = Math.floor(currentBalance * maxPenaltyPercentage);
      
      const finalQuitCoins = Math.max(
        minPenalty,
        Math.min(quitCoins, maxPenalty, currentBalance)
      );

      const newBalance = currentBalance - finalQuitCoins;

      if (newBalance > 0) {
        await this.kardexService.removeCoins(
          user.id,
          finalQuitCoins,
          `${infractionConfig.name} - ${reasonOption.value}`
        )
      } else {
        await this.kardexService.setCoins(
          user.id,
          0,
          `${infractionConfig.name} - ${reasonOption.value}`
        )
      }

      const userUpdated = await this.userDiscordService.findOne(user.id)

      let additionalInfo = '';
      if (durationOption?.value) {
        additionalInfo += `\nMute aplicado: ${durationOption.value} minutos`;
      }
      if (roleOption?.value) {
        additionalInfo += `\nRol asignado: <@&${roleOption.value}>`;
      }

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content:
            `${infractionConfig.emoji} Sanción registrada - <@${user.id}>\n` +
            `Tipo: ${infractionConfig.name}\n` +
            `Puntos de sanción: +${infractionConfig.points}\n` +
            `Monedas perdidas: ${Math.floor(finalQuitCoins)}\n` +
            `Razón: ${reasonOption.value}${additionalInfo}\n` +
            `Total puntos: ${userUpdated.points}/${maxInfractionPoints}\n` +
            `Balance actual: ${Math.floor(newBalance > 0 ? newBalance : 0)} monedas`
            + (userUpdated.points >= maxInfractionPoints ? "\n🎉 ¡Has alcanzado el límite máximo de sanciones! Has sido domado." : "")
        }
      }
    } catch (error) {
      console.error('Error al aplicar sanción:', error)
      return createErrorResponse('Error al procesar la sanción.')
    }
  }
}
