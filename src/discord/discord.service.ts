import { Injectable, HttpException } from '@nestjs/common';
import {
  getGuildMemberCount,
  getOnlineMemberCount,
} from '../utils/discord-utils';
import { LibraryService } from '../library/library.service';
import { UserDiscordService } from '../user-discord/user-discord.service';
import { InteractionResponseType } from 'discord.js';
import * as nacl from 'tweetnacl';

const INFRACTION_POINTS = {
  BLACK: 10,
  RED: 5,
  ORANGE: 3,
  YELLOW: 2,
};

@Injectable()
export class DiscordService {
  private readonly guildId = process.env.DISCORD_GUILD_ID;

  constructor(
    private readonly libraryService: LibraryService,
    private readonly userDiscordService: UserDiscordService,
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

  async handleCreateNote(options: any[]): Promise<any> {
    try {
      const titulo = options.find((option) => option.name === 'titulo')?.value;
      const contenido = options.find(
        (option) => option.name === 'contenido',
      )?.value;

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

  async handleInfraction(options: any[]): Promise<any> {
    try {
      const userOption = options.find((option) => option.name === 'usuario');
      const tipo = options.find((option) => option.name === 'tipo')?.value;

      if (!userOption || !tipo || !INFRACTION_POINTS[tipo]) {
        return {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content:
              'Error: Usuario y tipo de infracción válido son requeridos.',
          },
        };
      }

      const discordUserData = {
        id: userOption.value,
        username: userOption.user.username,
        nickname: userOption.member?.nickname,
        roles: userOption.member?.roles || [],
        discordData: {
          ...userOption.user,
          member: {
            ...userOption.member,
            joinedAt: userOption.member?.joined_at,
            permissions: userOption.member?.permissions,
            communicationDisabledUntil:
              userOption.member?.communication_disabled_until,
          },
          avatar: userOption.user.avatar,
          discriminator: userOption.user.discriminator,
          bot: userOption.user.bot,
          system: userOption.user.system,
          flags: userOption.user.flags,
          globalName: userOption.user.global_name,
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

  async handleAddPoints(options: any[]): Promise<any> {
    try {
      const userOption = options.find((option) => option.name === 'usuario');
      const points = options.find((option) => option.name === 'puntos')?.value;

      if (!userOption || points === undefined) {
        return {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: 'Error: Usuario y puntos son requeridos.',
          },
        };
      }

      const discordUserData = {
        id: userOption.value,
        username: userOption.user.username,
        nickname: userOption.member?.nickname,
        roles: userOption.member?.roles || [],
        discordData: userOption.user,
      };

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
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: 'Error al añadir puntos. Por favor, intenta nuevamente.',
        },
      };
    }
  }

  async handleRemovePoints(options: any[]): Promise<any> {
    try {
      const userOption = options.find((option) => option.name === 'usuario');
      const points = options.find((option) => option.name === 'puntos').value;

      if (!userOption || points === undefined) {
        return {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: 'Error: Usuario y puntos son requeridos.',
          },
        };
      }

      const discordUserData = {
        id: userOption.value,
        username: userOption.user.username,
        nickname: userOption.member?.nickname,
        roles: userOption.member?.roles || [],
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

  async handleSetPoints(options: any[]): Promise<any> {
    try {
      const userOption = options.find((option) => option.name === 'usuario');
      const points = options.find((option) => option.name === 'puntos').value;

      if (!userOption || points === undefined) {
        return {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: 'Error: Usuario y puntos son requeridos.',
          },
        };
      }

      const discordUserData = {
        id: userOption.value,
        username: userOption.user.username,
        nickname: userOption.member?.nickname,
        roles: userOption.member?.roles || [],
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
}
