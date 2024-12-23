import { Injectable, HttpException } from '@nestjs/common';
import {
  CommandOption,
  DiscordUserData,
  InteractPoints,
} from './discord.types';
import {
  APIInteractionResponse,
  InteractionResponseType,
  APIMessageComponentInteraction,
} from 'discord.js';
import {
  getGuildMemberCount,
  getOnlineMemberCount,
} from '../utils/discord-utils';
import { LibraryService } from '../library/library.service';
import { UserDiscordService } from '../user-discord/user-discord.service';
import * as nacl from 'tweetnacl';
import { ConfigService } from '../config/config.service';

@Injectable()
export class DiscordService {
  private readonly guildId = process.env.DISCORD_GUILD_ID;
  private readonly watchedChannels =
    process.env.DISCORD_WATCHED_CHANNELS?.split(',') || [];

  constructor(
    private readonly libraryService: LibraryService,
    private readonly userDiscordService: UserDiscordService,
    private readonly configService: ConfigService,
  ) {}

  verifyDiscordRequest(
    signature: string,
    timestamp: string,
    body: any,
  ): boolean {
    const publicKey = process.env.DISCORD_PUBLIC_KEY;
    return nacl.sign.detached.verify(
      Buffer.from(timestamp + JSON.stringify(body)),
      Buffer.from(signature, 'hex'),
      Buffer.from(publicKey, 'hex'),
    );
  }

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

  async handleCreateNote(
    options: CommandOption[],
  ): Promise<APIInteractionResponse> {
    try {
      const titulo = options.find((opt) => opt.name === 'titulo')
        ?.value as string;
      const contenido = options.find((opt) => opt.name === 'contenido')
        ?.value as string;

      if (!titulo || !contenido) {
        return {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: 'Error: Título y contenido son requeridos.',
          },
        };
      }

      const data = {
        title: titulo,
        description: contenido,
        referenceDate: new Date(),
      };

      const note = await this.libraryService.create(data, null);
      const truncatedContent =
        contenido.length > 1000
          ? contenido.substring(0, 1000) + '...'
          : contenido;

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: `Nota creada exitosamente!\nURL: ${process.env.FRONT_URL}/library/${note.id}\n\nContenido:\n${truncatedContent}`,
        },
      };
    } catch (error) {
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: 'Error al crear la nota. Por favor, intenta nuevamente.',
        },
      };
    }
  }

  private async handlePointsOperation(
    data: InteractPoints,
    operation: 'add' | 'remove' | 'set',
  ): Promise<APIInteractionResponse> {
    try {
      const { userId, points, username, roles } = data;

      const discordUserData: DiscordUserData = {
        id: userId,
        username,
        roles: roles,
      };

      console.log('discordUserData', discordUserData);
      const discordUser = await this.userDiscordService.findOrCreate(
        discordUserData,
      );

      let newPoints: number;
      let actionText: string;

      switch (operation) {
        case 'add':
          await this.userDiscordService.addPenaltyPoints(
            discordUser.id,
            points,
          );
          newPoints = discordUser.penaltyPoints + points;
          actionText = 'añadido';
          break;
        case 'remove':
          await this.userDiscordService.addPenaltyPoints(
            discordUser.id,
            -points,
          );
          newPoints = discordUser.penaltyPoints - points;
          actionText = 'quitado';
          break;
        case 'set':
          await this.userDiscordService.updatePoints(discordUser.id, points);
          newPoints = points;
          actionText = 'establecido';
          break;
      }

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: `Se han ${actionText} ${points} puntos de penalización al usuario ${discordUser.username}. Total actual: ${newPoints} puntos.`,
        },
      };
    } catch (error) {
      console.error(`Error ${operation} puntos:`, error);
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: `Error al ${operation} puntos. Por favor, intenta nuevamente.`,
        },
      };
    }
  }

  async handleAddPoints(data: InteractPoints): Promise<APIInteractionResponse> {
    return this.handlePointsOperation(data, 'add');
  }

  async handleRemovePoints(
    data: InteractPoints,
  ): Promise<APIInteractionResponse> {
    return this.handlePointsOperation(data, 'remove');
  }

  async handleSetPoints(data: InteractPoints): Promise<APIInteractionResponse> {
    return this.handlePointsOperation(data, 'set');
  }

  async handleMessage(
    interaction: APIMessageComponentInteraction,
  ): Promise<APIInteractionResponse> {
    try {
      const channelId = interaction.channel_id;
      const isWatchedChannel = await this.configService.isWatchedChannel(
        channelId,
      );

      if (!isWatchedChannel || !interaction.message) {
        return null;
      }

      const userData = interaction.member?.user || interaction.user;
      const channelData = interaction.channel;
      const messageData = interaction.message;

      const userNoteData = {
        title: `Notas de ${userData.username}`,
        description: `Colección de notas de ${userData.username}`,
        referenceDate: new Date(),
      };

      const userNote = await this.libraryService.findOrCreateByTitle(
        userNoteData.title,
        null,
      );

      const channelNoteData = {
        title: channelData.name,
        description: `Notas del canal ${channelData.name}`,
        referenceDate: new Date(),
        parentNoteId: userNote.id,
      };

      const channelNote = await this.libraryService.findOrCreateByTitle(
        channelNoteData.title,
        userNote.id,
      );

      const messageNoteData = {
        title: messageData.content.substring(0, 50) + '...',
        description: messageData.content,
        referenceDate: new Date(),
        parentNoteId: channelNote.id,
      };

      await this.libraryService.create(messageNoteData, null);

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: `Nota creada exitosamente para el mensaje de ${userData.username}`,
        },
      };
    } catch (error) {
      console.error('Error procesando mensaje:', error);
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: 'Error al procesar el mensaje.',
        },
      };
    }
  }
}
