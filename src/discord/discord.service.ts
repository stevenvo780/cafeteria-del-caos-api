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
import * as nacl from 'tweetnacl';
import { ConfigService } from '../config/config.service';

@Injectable()
export class DiscordService {
  private readonly guildId = process.env.DISCORD_GUILD_ID;
  private readonly watchedChannels =
    process.env.DISCORD_WATCHED_CHANNELS?.split(',') || [];

  constructor(
    private readonly libraryService: LibraryService,
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
            content:
              ':PSYCO: Ah, la ignorancia... ¿Pretendías crear una nota sin su esencia básica? :CAOS:',
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
          content: `:ALIENS: La sabiduría ha sido plasmada en el vacío digital :ESQUIZO:\n${process.env.FRONT_URL}/library/${note.id}\n\n:TSUNAMI: He aquí la verdad revelada:\n${truncatedContent}`,
        },
      };
    } catch (error) {
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content:
            ':KILL: El caos ha engullido tu nota. La nada prevalece :PEPE:',
        },
      };
    }
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
          content: `:PANAS: Las palabras de ${userData.username} han trascendido al reino de lo eterno :zizekok~1:`,
        },
      };
    } catch (error) {
      console.error('Error procesando mensaje:', error);
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content:
            ':PSYCO: ¡MALDITA SEA! El mensaje se perdió en el vacío del caos :CAOS:',
        },
      };
    }
  }
}
