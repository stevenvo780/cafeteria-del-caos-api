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
    const titulo = options.find((option) => option.name === 'titulo').value;
    const contenido = options.find(
      (option) => option.name === 'contenido',
    ).value;

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
        content: `URL: ${process.env.FRONT_URL}/library/${note.id}\n\nContenido:\n${truncatedContent}`,
      },
    };
  }

  async handleInfraction(options: any[]): Promise<any> {
    const userOption = options.find((option) => option.name === 'usuario');
    const tipo = options.find((option) => option.name === 'tipo').value;

    // Crear o actualizar usuario de Discord con sus roles
    const discordUser = await this.userDiscordService.findOrCreate({
      id: userOption.value,
      username: userOption.user.username,
      nickname: userOption.member?.nickname,
      roles: userOption.member?.roles || [],
      // Incluir cualquier otro dato relevante de Discord
      ...userOption.user,
    });

    const points = INFRACTION_POINTS[tipo];
    await this.userDiscordService.addPenaltyPoints(discordUser.id, points);

    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: `Se han añadido ${points} puntos de penalización al usuario ${discordUser.username}.`,
      },
    };
  }
}
