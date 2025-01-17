import { Injectable } from '@nestjs/common';
import {
  InteractionResponseType,
  APIApplicationCommandInteractionDataOption,
  APIApplicationCommandInteractionDataStringOption,
} from 'discord.js';
import { LibraryService } from '../../../library/library.service';
import { LibraryVisibility } from '../../../library/entities/library.entity';
import { createErrorResponse } from '../../discord.util';
import { DiscordInteractionResponse } from '../../discord.types';
import { NotesCommands, NOTE_OPTIONS } from './types';
import { Library } from '../../../library/entities/library.entity';
import { CreateLibraryDto } from 'src/library/dto/create-library.dto';

@Injectable()
export class DiscordNotesService {
  constructor(private readonly libraryService: LibraryService) {}

  async handleNotesCommand(
    commandName: string,
    options: APIApplicationCommandInteractionDataOption[],
    userId: string,
    username: string,
  ): Promise<DiscordInteractionResponse> {
    try {
      switch (commandName) {
        case NotesCommands.CREATE_NOTE:
          return await this.handleCreateNote(options, username);
        default:
          return createErrorResponse('Comando de notas no reconocido');
      }
    } catch (error) {
      console.error(`Error en comando ${commandName}:`, error);
      return createErrorResponse('❌ Error al procesar el comando');
    }
  }

  private async handleCreateNote(
    options: APIApplicationCommandInteractionDataOption[],
    username: string,
  ): Promise<DiscordInteractionResponse> {
    const titleOption = options.find(
      (opt) => opt.name === NOTE_OPTIONS.TITLE.name,
    ) as APIApplicationCommandInteractionDataStringOption;
    const contentOption = options.find(
      (opt) => opt.name === NOTE_OPTIONS.CONTENT.name,
    ) as APIApplicationCommandInteractionDataStringOption;

    const title = this.getStringOptionValue(titleOption);
    const content = this.getStringOptionValue(contentOption);

    if (!title || !content) {
      return createErrorResponse(
        'Ah, la ignorancia... ¿Pretendías crear una nota sin su esencia básica?',
      );
    }

    try {
      const rootFolder = await this.libraryService.findOrCreateByTitle(
        'Notas de Discord',
        LibraryVisibility.GENERAL,
      );

      const userFolder = await this.libraryService.findOrCreateByTitle(
        `Notas de ${username}`,
        LibraryVisibility.GENERAL,
        rootFolder,
      );

      const noteData: Partial<Library> = {
        title,
        description: content,
        referenceDate: new Date(),
        parent: userFolder,
        visibility: LibraryVisibility.GENERAL,
      };

      const note = await this.libraryService.create(
        noteData as CreateLibraryDto,
        null,
      );

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: `La sabiduría ha sido plasmada\n${process.env.FRONT_URL}/library/${note.id}\n`,
        },
      };
    } catch (error) {
      console.error('Error al crear nota:', error);
      return createErrorResponse('❌ Error al crear la nota');
    }
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
