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

export const NotesCommandData = {
  [NotesCommands.CREATE_NOTE]: {
    command: NotesCommands.CREATE_NOTE,
    description: 'Crea una nota pública en la librería',
    options: [NOTE_OPTIONS.TITLE, NOTE_OPTIONS.CONTENT],
  },
} as const;
