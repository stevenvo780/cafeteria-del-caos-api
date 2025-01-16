import { QUANTITY_OPTION, USER_OPTION } from '../base-command-options';

export enum ExperienceCommands {
  GET_EXPERIENCE = 'ver-experiencia',
  TOP_EXPERIENCE = 'top-experiencia',
  GIVE_EXPERIENCE = 'dar-experiencia',
  REMOVE_EXPERIENCE = 'quitar-experiencia',
  SET_EXPERIENCE = 'establecer-experiencia',
}

export const EXPERIENCE_OPTION = {
  ...QUANTITY_OPTION,
  name: 'cantidad',
  description: 'Cantidad de experiencia',
  min_value: 0,
} as const;

const CommonExperienceOptions = {
  VIEW: [USER_OPTION],
  MODIFY: [{ ...USER_OPTION, required: true }, EXPERIENCE_OPTION],
} as const;

export const ExperienceCommandData = {
  [ExperienceCommands.GET_EXPERIENCE]: {
    command: ExperienceCommands.GET_EXPERIENCE,
    description: 'Consulta tu experiencia acumulada',
    options: CommonExperienceOptions.VIEW,
  },
  [ExperienceCommands.TOP_EXPERIENCE]: {
    command: ExperienceCommands.TOP_EXPERIENCE,
    description: 'Muestra el top 10 de usuarios con más experiencia',
    options: [],
  },
  [ExperienceCommands.GIVE_EXPERIENCE]: {
    command: ExperienceCommands.GIVE_EXPERIENCE,
    description: 'Da experiencia a un usuario',
    options: CommonExperienceOptions.MODIFY,
  },
  [ExperienceCommands.REMOVE_EXPERIENCE]: {
    command: ExperienceCommands.REMOVE_EXPERIENCE,
    description: 'Quita experiencia a un usuario',
    options: CommonExperienceOptions.MODIFY,
  },
  [ExperienceCommands.SET_EXPERIENCE]: {
    command: ExperienceCommands.SET_EXPERIENCE,
    description:
      'Establece una cantidad específica de experiencia a un usuario',
    options: CommonExperienceOptions.MODIFY,
  },
} as const;
