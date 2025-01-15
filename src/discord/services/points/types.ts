import { ApplicationCommandOptionType } from 'discord.js';
import { BaseCommandOptions } from '../../discord-commands.config';

export enum PointsCommands {
  GET_POINTS = 'ver-puntos',
  ADD_POINTS = 'agregar-puntos',
  REMOVE_POINTS = 'quitar-puntos',
  SET_POINTS = 'establecer-puntos',
}

const POINTS_OPTION = {
  name: 'puntos',
  type: ApplicationCommandOptionType.Integer,
  description: 'Cantidad de puntos',
  min_value: 0,
  required: true,
} as const;
console.log(BaseCommandOptions);
const CommonPointsOptions = {
  VIEW: [BaseCommandOptions.USER],
  MODIFY: [{ ...BaseCommandOptions.USER, required: true }, POINTS_OPTION],
} as const;

export const PointsCommandOptions = {
  [PointsCommands.GET_POINTS]: CommonPointsOptions.VIEW,
  [PointsCommands.ADD_POINTS]: CommonPointsOptions.MODIFY,
  [PointsCommands.REMOVE_POINTS]: CommonPointsOptions.MODIFY,
  [PointsCommands.SET_POINTS]: CommonPointsOptions.MODIFY,
} as const;

// Descripciones específicas de los comandos de puntos
export const PointsCommandData = {
  commands: Object.values(PointsCommands) as string[],
  descriptions: {
    [PointsCommands.GET_POINTS]: 'Consulta los puntos de penalización',
    [PointsCommands.ADD_POINTS]: 'Añade puntos de penalización a un usuario',
    [PointsCommands.REMOVE_POINTS]: 'Quita puntos de penalización a un usuario',
    [PointsCommands.SET_POINTS]:
      'Establece una cantidad específica de puntos a un usuario',
  },
  options: PointsCommandOptions,
} as const;
