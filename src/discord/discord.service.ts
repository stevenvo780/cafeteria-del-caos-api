import { Injectable, HttpException } from '@nestjs/common';
import { CommandOption, DiscordUserData } from './types/discord.types';
import {
  APIInteractionResponse,
  InteractionResponseType,
  APIMessageComponentInteraction,
  APIGuildMember,
} from 'discord.js';
import {
  getGuildMemberCount,
  getOnlineMemberCount,
} from '../utils/discord-utils';
import { LibraryService } from '../library/library.service';
import { UserDiscordService } from '../user-discord/user-discord.service';
import * as nacl from 'tweetnacl';
import { ConfigService } from '../config/config.service';

const INFRACTION_POINTS: Record<string, number> = {
  BLACK: 10,
  RED: 5,
  ORANGE: 3,
  YELLOW: 2,
};

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

  async handleInfraction(
    options: CommandOption[],
  ): Promise<APIInteractionResponse> {
    try {
      const userOption = options.find((opt) => opt.name === 'usuario');
      const tipo = options.find((opt) => opt.name === 'tipo')?.value as string;

      if (!userOption?.user || !tipo || !(tipo in INFRACTION_POINTS)) {
        return {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content:
              'Error: Usuario y tipo de infracción válido son requeridos.',
          },
        };
      }

      const discordUserData: DiscordUserData = {
        id: userOption.value as string,
        username: userOption.user.username,
        nickname: (userOption.member as APIGuildMember)?.nick,
        roles: (userOption.member as APIGuildMember)?.roles || [],
        discordData: {
          ...userOption.user,
          member: userOption.member,
        },
      };

      const discordUser = await this.userDiscordService.findOrCreate(
        discordUserData,
      );

      const points = INFRACTION_POINTS[tipo];
      await this.userDiscordService.addPenaltyPoints(discordUser.id, points);

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: `Se han añadido ${points} puntos de penalización al usuario ${discordUser.username} por infracción de tipo ${tipo}.`,
        },
      };
    } catch (error) {
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content:
            'Error al procesar la infracción. Por favor, intenta nuevamente.',
        },
      };
    }
  }

  async handleAddPoints(
    options: CommandOption[],
  ): Promise<APIInteractionResponse> {
    try {
      const userOption = options.find((opt) => opt.name === 'usuario');
      const pointsValue = options.find((opt) => opt.name === 'puntos')?.value;
      const points =
        typeof pointsValue === 'string'
          ? parseInt(pointsValue, 10)
          : Number(pointsValue);

      if (!userOption?.user || isNaN(points)) {
        return {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: { content: 'Error: Usuario y puntos válidos son requeridos.' },
        };
      }

      const discordUserData: DiscordUserData = {
        id: userOption.value as string,
        username: userOption.user.username,
        nickname: (userOption.member as APIGuildMember)?.nick,
        roles: (userOption.member as APIGuildMember)?.roles || [],
        discordData: userOption.user,
      };
      console.log('discordUserData', discordUserData);
      const discordUser = await this.userDiscordService.findOrCreate(
        discordUserData,
      );
      await this.userDiscordService.addPenaltyPoints(discordUser.id, points);

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: `Se han añadido ${points} puntos de penalización al usuario ${
            discordUser.username
          }. Total actual: ${discordUser.penaltyPoints + points} puntos.`,
        },
      };
    } catch (error) {
      console.error('Error añadiendo puntos:', error);
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: 'Error al añadir puntos. Por favor, intenta nuevamente.',
        },
      };
    }
  }

  async handleRemovePoints(
    options: CommandOption[],
  ): Promise<APIInteractionResponse> {
    try {
      const userOption = options.find((opt) => opt.name === 'usuario');
      const pointsValue = options.find((opt) => opt.name === 'puntos')?.value;
      const points =
        typeof pointsValue === 'string'
          ? parseInt(pointsValue, 10)
          : Number(pointsValue);

      if (!userOption?.user || isNaN(points)) {
        return {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: { content: 'Error: Usuario y puntos válidos son requeridos.' },
        };
      }

      const discordUserData: DiscordUserData = {
        id: userOption.value as string,
        username: userOption.user.username,
        nickname: (userOption.member as APIGuildMember)?.nick,
        roles: (userOption.member as APIGuildMember)?.roles || [],
        discordData: userOption.user,
      };

      const discordUser = await this.userDiscordService.findOrCreate(
        discordUserData,
      );
      await this.userDiscordService.addPenaltyPoints(discordUser.id, -points);

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: `Se han quitado ${points} puntos de penalización al usuario ${discordUser.username}.`,
        },
      };
    } catch (error) {
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: 'Error al quitar puntos. Por favor, intenta nuevamente.',
        },
      };
    }
  }

  async handleSetPoints(
    options: CommandOption[],
  ): Promise<APIInteractionResponse> {
    try {
      const userOption = options.find((opt) => opt.name === 'usuario');
      const pointsValue = options.find((opt) => opt.name === 'puntos')?.value;
      const points =
        typeof pointsValue === 'string'
          ? parseInt(pointsValue, 10)
          : Number(pointsValue);

      if (!userOption?.user || isNaN(points)) {
        return {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: { content: 'Error: Usuario y puntos válidos son requeridos.' },
        };
      }

      const discordUserData: DiscordUserData = {
        id: userOption.value as string,
        username: userOption.user.username,
        nickname: (userOption.member as APIGuildMember)?.nick,
        roles: (userOption.member as APIGuildMember)?.roles || [],
        discordData: userOption.user,
      };

      const discordUser = await this.userDiscordService.findOrCreate(
        discordUserData,
      );
      await this.userDiscordService.updatePoints(discordUser.id, points);

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: `Se han establecido ${points} puntos de penalización al usuario ${discordUser.username}.`,
        },
      };
    } catch (error) {
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: 'Error al establecer puntos. Por favor, intenta nuevamente.',
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
