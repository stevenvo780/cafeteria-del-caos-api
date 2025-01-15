import { ApplicationCommandOptionType } from 'discord.js';
import { BaseCommandOptions } from '../../discord-commands.config';

export enum NotesCommands {
  CREATE_NOTE = 'crear-nota',
  EDIT_NOTE = 'editar-nota',
  DELETE_NOTE = 'eliminar-nota',
  VIEW_NOTES = 'ver-notas',
}

const NOTE_OPTIONS = {
  TITLE: {
    name: 'titulo',
    type: ApplicationCommandOptionType.String,
    description: 'Título de la nota',
    required: true,
  },
  CONTENT: {
    name: 'contenido',
    type: ApplicationCommandOptionType.String,
    description: 'Contenido de la nota',
    required: true,
  },
} as const;

export const NotesCommandOptions = {
  [NotesCommands.CREATE_NOTE]: [NOTE_OPTIONS.TITLE, NOTE_OPTIONS.CONTENT],
  [NotesCommands.EDIT_NOTE]: [
    BaseCommandOptions.ID,
    { ...NOTE_OPTIONS.TITLE, required: false },
    { ...NOTE_OPTIONS.CONTENT, required: false },
  ],
  [NotesCommands.DELETE_NOTE]: [BaseCommandOptions.ID],
  [NotesCommands.VIEW_NOTES]: [BaseCommandOptions.USER],
} as const;

// Descripciones de los comandos de notas
export const NotesCommandData = {
  commands: Object.values(NotesCommands) as string[],
  descriptions: {
    [NotesCommands.CREATE_NOTE]: 'Crea una nota pública en la librería',
    [NotesCommands.EDIT_NOTE]: 'Edita una nota existente',
    [NotesCommands.DELETE_NOTE]: 'Elimina una nota',
    [NotesCommands.VIEW_NOTES]: 'Ver notas',
  },
  options: NotesCommandOptions,
} as const;
