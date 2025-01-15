import { ApplicationCommandOptionType } from 'discord.js';
import { ID_OPTION, USER_OPTION } from '../../base-command-options';

export enum InfractionCommands {
  ADD_INFRACTION = 'añadir-sancion',
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

export const InfractionCommandData = {
  [InfractionCommands.ADD_INFRACTION]: {
    command: InfractionCommands.ADD_INFRACTION,
    description: 'Añade una sanción a un usuario',
    options: CommonInfractionOptions.ADD, // Quitamos el array extra
  },
} as const;
