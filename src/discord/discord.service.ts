import { Injectable, HttpException } from '@nestjs/common';
import {
  APIChatInputApplicationCommandInteractionData,
  APIInteraction,
} from 'discord.js';
import { DiscordVerificationService } from './services/discord-verification.service';
import { DiscordNotesService } from './services/discord-notes.service';
import { DiscordPointsService } from './services/discord-points.service';
import { DiscordCoinsService } from './services/discord-coins.service';
import { DiscordExperienceService } from './services/discord-experience.service';
import { DiscordInfractionService } from './services/discord-infraction.service';
import { DiscordInteractionResponse } from './discord.types';
import {
  getGuildMemberCount,
  getOnlineMemberCount,
} from '../utils/discord-utils';
import { createErrorResponse } from './discord-responses.util';

@Injectable()
export class DiscordService {
  private readonly guildId = process.env.DISCORD_GUILD_ID;

  constructor(
    private readonly verificationService: DiscordVerificationService,
    private readonly notesService: DiscordNotesService,
    private readonly pointsService: DiscordPointsService,
    private readonly coinsService: DiscordCoinsService,
    private readonly experienceService: DiscordExperienceService,
    private readonly infractionService: DiscordInfractionService,
  ) {}

  async getGuildMemberCount(): Promise<number> {
    try {
      return await getGuildMemberCount(this.guildId);
    } catch (error) {
      throw new HttpException('Failed to fetch guild member count', 500);
    }
  }

  async getOnlineMemberCount(): Promise<number> {
    try {
      return await getOnlineMemberCount(this.guildId);
    } catch (error) {
      throw new HttpException('Failed to fetch online member count', 500);
    }
  }

  async handleWebhook(event: any): Promise<void> {
    console.log('Received webhook event:', event);
    if (event.interaction) {
      console.log('Interaction payload:', event.interaction);
    }
  }

  async handleApplicationCommand(
    commandData: APIChatInputApplicationCommandInteractionData,
    interactionPayload: APIInteraction,
  ): Promise<DiscordInteractionResponse> {
    switch (commandData.name) {
      case 'puntaje':
        return await this.pointsService.handleUserScore(
          commandData,
          interactionPayload.member,
        );
      case 'saldo':
        return await this.coinsService.handleUserBalance(
          commandData,
          interactionPayload.member,
        );
      case 'experiencia':
        return await this.experienceService.handleUserExperience(
          commandData,
          interactionPayload.member,
        );
      case 'top-experiencia':
        return await this.experienceService.handleTopExperienceRanking();
      case 'dar-experiencia':
      case 'quitar-experiencia':
      case 'establecer-experiencia':
        return await this.experienceService.handleExperienceCommand(
          commandData.name,
          commandData,
          interactionPayload,
        );
      case 'crear-nota':
        return await this.notesService.handleCreateNote(
          commandData.options || [],
          interactionPayload.member.user.id,
          interactionPayload.member.user.username,
        );
      case 'top-monedas':
        return await this.coinsService.handleTopCoins();
      case 'añadir-puntos':
      case 'quitar-puntos':
      case 'establecer-puntos':
        return await this.pointsService.handleUserPoints(
          commandData.name,
          commandData,
        );
      case 'dar-monedas':
      case 'quitar-monedas':
      case 'establecer-monedas':
      case 'transferir-monedas':
        return await this.coinsService.handleUserCoins(
          commandData.name,
          commandData,
          interactionPayload,
        );
      case 'comprar':
        return await this.coinsService.handlePurchase(
          commandData,
          interactionPayload,
        );
      case 'añadir-sancion':
        return await this.infractionService.handleAddInfraction(commandData);
      default:
        return createErrorResponse(
          `Comando "${commandData.name}" no reconocido.`,
        );
    }
  }

  verifyDiscordRequest(
    signature: string,
    timestamp: string,
    body: any,
  ): boolean {
    return this.verificationService.verifyDiscordRequest(
      signature,
      timestamp,
      body,
    );
  }
}
