import { ApplicationCommandOptionType } from 'discord.js';
import { USER_OPTION } from '../base-command-options';

export enum InfractionCommands {
  ADD_INFRACTION = 'agregar-sancion',
}

export const INFRACTION_TYPE_OPTION = {
  name: 'tipo',
  type: ApplicationCommandOptionType.String,
  description: 'Tipo de sanción',
  required: true,
} as const;

export const INFRACTION_REASON_OPTION = {
  name: 'razon',
  type: ApplicationCommandOptionType.String,
  description: 'Razón de la sanción',
  required: true,
} as const;

const CommonInfractionOptions = {
  ADD: [
    { ...USER_OPTION, required: true },
    INFRACTION_TYPE_OPTION,
    INFRACTION_REASON_OPTION,
  ],
} as const;

export const InfractionCommandData = {
  [InfractionCommands.ADD_INFRACTION]: {
    command: InfractionCommands.ADD_INFRACTION,
    description: 'Aplica una sanción a un usuario',
    options: CommonInfractionOptions.ADD,
  },
} as const;
