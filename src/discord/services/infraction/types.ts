import { ApplicationCommandOptionType } from 'discord.js';
import { USER_OPTION } from '../../base-command-options';

export enum InfractionCommands {
  ADD_INFRACTION = 'añadir-sancion',
}

async function buildInfractionOptions() {
  try {
    const apiUrl = `${process.env.URL_BACKEND}/config`;
    const response = await fetch(apiUrl);
    const data: any = await response.json();
    if (!data.infractions) return [];
    return data.infractions.map((inf: any) => ({
      name: inf.name,
      value: inf.value,
    }));
  } catch {
    return [];
  }
}

export const InfractionCommandData = {
  [InfractionCommands.ADD_INFRACTION]: {
    command: InfractionCommands.ADD_INFRACTION,
    description: 'Añade una sanción a un usuario',
    options: [
      {
        ...USER_OPTION,
        description: 'Usuario a sancionar',
        required: true,
      },
      {
        name: 'tipo',
        type: ApplicationCommandOptionType.String,
        description: 'Tipo de sanción',
        required: true,
        choices: buildInfractionOptions(),
      },
      {
        name: 'razon',
        type: ApplicationCommandOptionType.String,
        description: 'Razón de la sanción',
        required: true,
      },
    ],
  },
} as const;
