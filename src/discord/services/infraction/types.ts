import { ApplicationCommandOptionType } from 'discord.js'
import { USER_OPTION } from '../base-command-options'
import { Infraction } from 'src/config/dto/update-config.dto';

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
  required: true,
  choices: [],
}

const buildPurchaseOptions = async () => {
  try {
    const apiUrl = `${process.env.URL_BACKEND}/config/infractions`;
    const response = await fetch(apiUrl);
    const data = await response.json() as Infraction[];
    if (!data || !Array.isArray(data)) {
      throw new Error('Invalid products data format');
    }

    INFRACTION_TYPE_OPTION.choices = data.map((infraction) => ({
      name: `${infraction.emoji} ${infraction.name} (${infraction.points} puntos)`,
      value: infraction.value.toString(),
    }));

    return [
      {
        name: SanctionType.NONE,
        type: ApplicationCommandOptionType.Subcommand,
        description: 'No se aplica ninguna acción adicional',
        options: [
          { ...USER_OPTION, required: true },
          INFRACTION_TYPE_OPTION,
          INFRACTION_REASON_OPTION,
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
    ];
  } catch (error) {
    console.error('Error fetching purchase options:', error);
    throw new Error('Error fetching purchase options');
  }
};

export const INFRACTION_REASON_OPTION = {
  name: 'razon',
  type: ApplicationCommandOptionType.String,
  description: 'Razón de la sanción',
  required: true
}

export const INFRACTION_ROLE_OPTION = {
  name: 'rol',
  type: ApplicationCommandOptionType.String,
  description: 'Rol a asignar',
  required: true
}

export const INFRACTION_DURATION_OPTION = {
  name: 'duracion',
  type: ApplicationCommandOptionType.Integer,
  description: 'Tiempo (en minutos)',
  required: true
}

export const InfractionCommandData = {
  [InfractionCommands.ADD_INFRACTION]: {
    command: InfractionCommands.ADD_INFRACTION,
    description: 'Aplica una sanción a un usuario',
    options: buildPurchaseOptions
  }
}
