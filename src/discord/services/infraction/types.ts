import { ApplicationCommandOptionType } from 'discord.js'
import { USER_OPTION } from '../base-command-options'

export enum InfractionCommands {
  ADD_INFRACTION = 'añadir-sancion'
}

export enum SanctionType {
  NONE = 'nada',
  MUTE = 'mute',
  ROLE = 'rol'
}

export const INFRACTION_TYPE_OPTION = {
  name: 'tipo',
  type: ApplicationCommandOptionType.String,
  description: 'Tipo de sanción',
  required: true
} as const

export const INFRACTION_REASON_OPTION = {
  name: 'razon',
  type: ApplicationCommandOptionType.String,
  description: 'Razón de la sanción',
  required: true
} as const

export const INFRACTION_ROLE_OPTION = {
  name: 'rol',
  type: ApplicationCommandOptionType.String,
  description: 'Rol a asignar',
  required: false
} as const

export const INFRACTION_DURATION_OPTION = {
  name: 'duracion',
  type: ApplicationCommandOptionType.Integer,
  description: 'Tiempo (en minutos)',
  required: false
} as const

export const InfractionCommandData = {
  [InfractionCommands.ADD_INFRACTION]: {
    command: InfractionCommands.ADD_INFRACTION,
    description: 'Aplica una sanción a un usuario',
    options: [
      {
        name: SanctionType.NONE,
        type: ApplicationCommandOptionType.Subcommand,
        description: 'No se aplica ninguna acción adicional',
        options: [
          { ...USER_OPTION, required: true },
          INFRACTION_TYPE_OPTION,
          INFRACTION_REASON_OPTION
        ]
      },
      {
        name: SanctionType.MUTE,
        type: ApplicationCommandOptionType.Subcommand,
        description: 'Silenciar al usuario',
        options: [
          { ...USER_OPTION, required: true },
          INFRACTION_TYPE_OPTION,
          INFRACTION_REASON_OPTION,
          INFRACTION_DURATION_OPTION
        ]
      },
      {
        name: SanctionType.ROLE,
        type: ApplicationCommandOptionType.Subcommand,
        description: 'Asignar un rol al usuario',
        options: [
          { ...USER_OPTION, required: true },
          INFRACTION_TYPE_OPTION,
          INFRACTION_REASON_OPTION,
          INFRACTION_ROLE_OPTION
        ]
      }
    ]
  }
} as const
