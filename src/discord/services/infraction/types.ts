import { ApplicationCommandOptionType } from 'discord.js';
import { ID_OPTION, USER_OPTION } from '../../base-command-options';

export enum InfractionCommands {
  ADD_INFRACTION = 'añadir-sancion',
  ADD_INFRACTION_ALT = 'añadir-sancion-alt',
  REMOVE_INFRACTION = 'quitar-sancion',
}

const INFRACTION_OPTIONS = {
  TYPE: {
    name: 'tipo',
    type: ApplicationCommandOptionType.String,
    description: 'Tipo de sanción',
    required: true,
    choices: [
      {
        name: '◼️ Negro - Violencia extrema/Doxing/CP/Estafas (10 puntos)',
        value: 'BLACK',
      },
      {
        name: '♦️ Rojo - NSFW/Acoso grave/Suplantación (5 puntos)',
        value: 'RED',
      },
      {
        name: '🔶 Naranja - Insultos/Amenazas/Odio (3 puntos)',
        value: 'ORANGE',
      },
      {
        name: '☢️ Amarillo - Discriminación leve/Spam (2 puntos)',
        value: 'YELLOW',
      },
    ],
  },
  REASON: {
    name: 'razon',
    type: ApplicationCommandOptionType.String,
    description: 'Razón de la sanción',
    required: true,
  },
} as const;

const CommonInfractionOptions = {
  ADD: [
    {
      ...USER_OPTION,
      description: 'Usuario a sancionar',
      required: true,
    },
    INFRACTION_OPTIONS.TYPE,
    INFRACTION_OPTIONS.REASON,
  ],
  REMOVE: [{ ...USER_OPTION, required: true }, ID_OPTION],
} as const;

export const InfractionCommandOptions = {
  [InfractionCommands.ADD_INFRACTION]: CommonInfractionOptions.ADD,
  [InfractionCommands.ADD_INFRACTION_ALT]: CommonInfractionOptions.ADD,
  [InfractionCommands.REMOVE_INFRACTION]: CommonInfractionOptions.REMOVE,
} as const;

// Descripciones de los comandos de sanciones
export const InfractionCommandData = {
  commands: Object.values(InfractionCommands) as string[],
  descriptions: {
    [InfractionCommands.ADD_INFRACTION]: 'Añade una sanción a un usuario',
    [InfractionCommands.ADD_INFRACTION_ALT]:
      'Añade una sanción a un usuario (alternativo)',
    [InfractionCommands.REMOVE_INFRACTION]: 'Elimina una sanción',
  },
  options: InfractionCommandOptions,
} as const;
