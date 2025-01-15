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
    const commandName = commandData.name;

    // Agrupamos comandos por servicio
    if (
      [
        'puntaje',
        'añadir-puntos',
        'quitar-puntos',
        'establecer-puntos',
      ].includes(commandName)
    ) {
      return this.pointsService.handlePointsCommand(
        commandName,
        commandData,
        interactionPayload,
      );
    }

    if (
      [
        'saldo',
        'top-monedas',
        'dar-monedas',
        'quitar-monedas',
        'establecer-monedas',
        'transferir-monedas',
        'comprar',
      ].includes(commandName)
    ) {
      return this.coinsService.handleCoinsCommand(
        commandName,
        commandData,
        interactionPayload,
      );
    }

    if (
      [
        'experiencia',
        'top-experiencia',
        'dar-experiencia',
        'quitar-experiencia',
        'establecer-experiencia',
      ].includes(commandName)
    ) {
      return this.experienceService.handleExperienceCommand(
        commandName,
        commandData,
        interactionPayload,
      );
    }

    if (['crear-nota'].includes(commandName)) {
      return this.notesService.handleNotesCommand(
        commandName,
        commandData.options || [],
        interactionPayload.member.user.id,
        interactionPayload.member.user.username,
      );
    }

    if (['añadir-sancion', 'agregar-sancion'].includes(commandName)) {
      return this.infractionService.handleInfractionCommand(
        commandName,
        commandData,
      );
    }

    return createErrorResponse(`Comando "${commandName}" no reconocido.`);
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
