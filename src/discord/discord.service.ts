import { Injectable, HttpException } from '@nestjs/common';
import {
  APIChatInputApplicationCommandInteractionData,
  APIInteraction,
} from 'discord.js';
import { DiscordNotesService } from './services/notes/discord-notes.service';
import { DiscordPointsService } from './services/points/discord-points.service';
import { DiscordCoinsService } from './services/coins/discord-coins.service';
import { DiscordExperienceService } from './services/experience/discord-experience.service';
import { DiscordInfractionService } from './services/infraction/discord-infraction.service';
import { DiscordInteractionResponse } from './discord.types';
import {
  getGuildMemberCount,
  getOnlineMemberCount,
} from '../utils/discord-utils';
import { createErrorResponse, verifyDiscordRequest } from './discord.util';
import {
  CommandCategories,
  getCommandCategory,
} from './discord-commands.config';

@Injectable()
export class DiscordService {
  private readonly guildId = process.env.DISCORD_GUILD_ID;

  constructor(
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
    const category = getCommandCategory(commandName);
    if (!category) {
      return createErrorResponse(`Comando "${commandName}" no reconocido.`);
    }

    if (category === CommandCategories.POINTS) {
      return this.pointsService.handlePointsCommand(
        commandName,
        commandData,
        interactionPayload,
      );
    }
    if (category === CommandCategories.COINS) {
      return this.coinsService.handleCoinsCommand(
        commandName,
        commandData,
        interactionPayload,
      );
    }
    if (category === CommandCategories.EXPERIENCE) {
      return this.experienceService.handleExperienceCommand(
        commandName,
        commandData,
        interactionPayload,
      );
    }
    if (category === CommandCategories.NOTES) {
      return this.notesService.handleNotesCommand(
        commandName,
        commandData.options || [],
        interactionPayload.member.user.id,
        interactionPayload.member.user.username,
      );
    }
    if (category === CommandCategories.INFRACTION) {
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
    return verifyDiscordRequest(signature, timestamp, body);
  }
}
