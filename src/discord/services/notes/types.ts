import { ApplicationCommandOptionType } from 'discord.js';

export enum NotesCommands {
  CREATE_NOTE = 'crear-nota',
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
} as const;

// Descripciones de los comandos de notas
export const NotesCommandData = {
  commands: Object.values(NotesCommands) as string[],
  descriptions: {
    [NotesCommands.CREATE_NOTE]: 'Crea una nota pública en la librería',
  },
  options: NotesCommandOptions,
} as const;
