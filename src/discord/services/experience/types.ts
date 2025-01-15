import { QUANTITY_OPTION, USER_OPTION } from '../../base-command-options';

export enum ExperienceCommands {
  GET_EXPERIENCE = 'ver-experiencia',
  TOP_EXPERIENCE = 'top-experiencia',
  GIVE_EXPERIENCE = 'dar-experiencia',
  REMOVE_EXPERIENCE = 'quitar-experiencia',
  SET_EXPERIENCE = 'establecer-experiencia',
}

const EXPERIENCE_OPTION = {
  ...QUANTITY_OPTION,
  name: 'cantidad',
  description: 'Cantidad de experiencia',
  min_value: 0,
} as const;

const CommonExperienceOptions = {
  VIEW: [USER_OPTION],
  MODIFY: [{ ...USER_OPTION, required: true }, EXPERIENCE_OPTION],
} as const;

export const ExperienceCommandOptions = {
  [ExperienceCommands.GET_EXPERIENCE]: CommonExperienceOptions.VIEW,
  [ExperienceCommands.TOP_EXPERIENCE]: [],
  [ExperienceCommands.GIVE_EXPERIENCE]: CommonExperienceOptions.MODIFY,
  [ExperienceCommands.REMOVE_EXPERIENCE]: CommonExperienceOptions.MODIFY,
  [ExperienceCommands.SET_EXPERIENCE]: CommonExperienceOptions.MODIFY,
} as const;

// Descripciones de los comandos de experiencia
export const ExperienceCommandData = {
  commands: Object.values(ExperienceCommands) as string[],
  descriptions: {
    [ExperienceCommands.GET_EXPERIENCE]: 'Consulta tu experiencia acumulada',
    [ExperienceCommands.TOP_EXPERIENCE]:
      'Muestra el top 10 de usuarios con más experiencia',
    [ExperienceCommands.GIVE_EXPERIENCE]: 'Da experiencia a un usuario',
    [ExperienceCommands.REMOVE_EXPERIENCE]: 'Quita experiencia a un usuario',
    [ExperienceCommands.SET_EXPERIENCE]:
      'Establece una cantidad específica de experiencia a un usuario',
  },
  options: ExperienceCommandOptions,
} as const;
