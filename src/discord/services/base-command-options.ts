import { ApplicationCommandOptionType } from 'discord.js';

export const USER_OPTION = {
  name: 'usuario',
  type: ApplicationCommandOptionType.User,
  description: 'Usuario objetivo',
  required: false,
} as const;

export const QUANTITY_OPTION = {
  name: 'cantidad',
  type: ApplicationCommandOptionType.Integer,
  description: 'Cantidad',
  required: true,
  min_value: 0,
} as const;

export const ID_OPTION = {
  name: 'id',
  type: ApplicationCommandOptionType.String,
  description: 'ID del elemento',
  required: true,
} as const;

export type CommandOption =
  | typeof USER_OPTION
  | typeof QUANTITY_OPTION
  | typeof ID_OPTION;
