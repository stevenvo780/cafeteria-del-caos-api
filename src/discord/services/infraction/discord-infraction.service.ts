// discord-infraction.service.ts
import { Injectable } from '@nestjs/common'
import {
  InteractionResponseType,
  APIChatInputApplicationCommandInteractionData,
  APIApplicationCommandInteractionDataSubcommandOption,
  APIApplicationCommandInteractionDataNumberOption,
  APIApplicationCommandInteractionDataStringOption,
  ApplicationCommandOptionType
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
  SanctionType
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
    const subcommand = commandData.options?.[0] as APIApplicationCommandInteractionDataSubcommandOption
    if (!subcommand) return createErrorResponse('Subcomando no encontrado.')

    const user = await this.userDiscordService.resolveInteractionUser(commandData, USER_OPTION.name)
    if (!user) {
      return createErrorResponse('Usuario no encontrado.')
    }

    const typeOption = subcommand.options?.find(
      opt => opt.name === INFRACTION_TYPE_OPTION.name
    ) as APIApplicationCommandInteractionDataStringOption
    const reasonOption = subcommand.options?.find(
      opt => opt.name === INFRACTION_REASON_OPTION.name
    ) as APIApplicationCommandInteractionDataStringOption
    const durationOption = subcommand.options?.find(
      opt => opt.name === INFRACTION_DURATION_OPTION.name
    ) as APIApplicationCommandInteractionDataNumberOption
    const roleOption = subcommand.options?.find(
      opt => opt.name === INFRACTION_ROLE_OPTION.name
    ) as APIApplicationCommandInteractionDataStringOption

    if (!typeOption || !reasonOption) {
      return createErrorResponse('Faltan parámetros para la sanción.')
    }

    const config = await this.configService.getConfig()
    const infractionConfig = config.infractions.find(
      inf => inf.value === typeOption.value
    )
    if (!infractionConfig) {
      return createErrorResponse('Tipo de sanción no válido.')
    }

    const client = await getDiscordClient()
    const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID!)
    const member = guild?.members.cache.get(user.id)

    switch (subcommand.name) {
      case SanctionType.MUTE:
        if (member && durationOption?.value) {
          const durationMs = Number(durationOption.value) * 60000
          await member.timeout(durationMs, `Muteo: ${reasonOption.value}`)
        }
        break
      case SanctionType.ROLE:
        if (member && roleOption?.value) {
          await member.roles.add(roleOption.value, `Sanción: ${reasonOption.value}`)
        }
        break
      default:
        break
    }

    try {
      await this.userDiscordService.addPenaltyPoints(user.id, infractionConfig.points)
      const currentBalance = await this.kardexService.getUserLastBalance(user.id)
      const newBalance = this.calculateCoinPenalty(infractionConfig.points, currentBalance)
      const coinsLost = currentBalance - newBalance

      if (coinsLost > 0) {
        await this.kardexService.setCoins(
          user.id,
          newBalance,
          `${infractionConfig.name} - ${reasonOption.value}`
        )
      }

      const userUpdated = await this.userDiscordService.findOne(user.id)

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content:
            `${infractionConfig.emoji} Sanción registrada - <@${user.id}>\n` +
            `Tipo: ${infractionConfig.name}\n` +
            `Puntos de sanción: +${infractionConfig.points}\n` +
            `Monedas perdidas: ${Math.floor(coinsLost)}\n` +
            `Razón: ${reasonOption.value}\n` +
            `Total puntos: ${userUpdated.points}/10\n` +
            `Balance actual: ${Math.floor(newBalance)} monedas`
        }
      }
    } catch (error) {
      console.error('Error al aplicar sanción:', error)
      return createErrorResponse('Error al procesar la sanción.')
    }
  }

  private calculateCoinPenalty(points: number, totalCoins: number): number {
    const suma = Math.floor(points * 10)
    const resta = Math.floor(100 / suma)
    return Math.max(0, totalCoins - resta)
  }
}
