import { Injectable } from '@nestjs/common';
import {
  InteractionResponseType,
  APIApplicationCommandInteractionDataOption,
} from 'discord.js';
import { LibraryService } from '../../library/library.service';
import { LibraryVisibility } from '../../library/entities/library.entity';
import { createErrorResponse } from '../discord-responses.util';
import { DiscordInteractionResponse } from '../discord.types';

@Injectable()
export class DiscordNotesService {
  constructor(private readonly libraryService: LibraryService) {}

  async handleNotesCommand(
    commandName: string,
    options: APIApplicationCommandInteractionDataOption[],
    userId: string,
    username: string,
  ): Promise<DiscordInteractionResponse> {
    switch (commandName) {
      case 'crear-nota':
        return await this.createNote(options, userId, username);
      default:
        return {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: { content: 'Comando de notas no reconocido.' },
        };
    }
  }

  private async createNote(
    options: APIApplicationCommandInteractionDataOption[],
    userId: string,
    username: string,
  ): Promise<DiscordInteractionResponse> {
    const tituloOption = options.find((opt) => opt.name === 'titulo');
    const contenidoOption = options.find((opt) => opt.name === 'contenido');

    const titulo = this.getStringOptionValue(tituloOption);
    const contenido = this.getStringOptionValue(contenidoOption);

    if (!titulo || !contenido) {
      return createErrorResponse(
        'Ah, la ignorancia... ¿Pretendías crear una nota sin su esencia básica?',
      );
    }

    const rootFolder = await this.libraryService.findOrCreateByTitle(
      'Notas de Discord',
      LibraryVisibility.GENERAL,
    );

    const userFolder = await this.libraryService.findOrCreateByTitle(
      `Notas de ${username}`,
      LibraryVisibility.GENERAL,
      rootFolder,
    );

    const data = {
      title: titulo,
      description: contenido,
      referenceDate: new Date(),
      parent: userFolder,
      visibility: LibraryVisibility.GENERAL,
    };

    const note = await this.libraryService.create(data, null);

    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: `La sabiduría ha sido plasmada\n${process.env.FRONT_URL}/library/${note.id}\n`,
      },
    };
  }

  private getStringOptionValue(
    option: APIApplicationCommandInteractionDataOption | undefined,
  ): string | null {
    if (!option || !('value' in option) || typeof option.value !== 'string') {
      return null;
    }
    return option.value;
  }
}
