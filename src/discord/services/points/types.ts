import { ApplicationCommandOptionType } from 'discord.js';
import { USER_OPTION } from '../base-command-options';

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

const CommonPointsOptions = {
  VIEW: [USER_OPTION],
  MODIFY: [{ ...USER_OPTION, required: true }, POINTS_OPTION],
} as const;

export const PointsCommandData = {
  [PointsCommands.GET_POINTS]: {
    command: PointsCommands.GET_POINTS,
    description: 'Consulta los puntos de penalización',
    options: CommonPointsOptions.VIEW,
  },
  [PointsCommands.ADD_POINTS]: {
    command: PointsCommands.ADD_POINTS,
    description: 'Añade puntos de penalización a un usuario',
    options: CommonPointsOptions.MODIFY,
  },
  [PointsCommands.REMOVE_POINTS]: {
    command: PointsCommands.REMOVE_POINTS,
    description: 'Quita puntos de penalización a un usuario',
    options: CommonPointsOptions.MODIFY,
  },
  [PointsCommands.SET_POINTS]: {
    command: PointsCommands.SET_POINTS,
    description: 'Establece una cantidad específica de puntos a un usuario',
    options: CommonPointsOptions.MODIFY,
  },
} as const;
