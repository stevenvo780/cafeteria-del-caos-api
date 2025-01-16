import { ApplicationCommandOptionType } from 'discord.js';
import fetch from 'node-fetch';
import { Infraction } from 'src/config/dto/update-config.dto';
import { USER_OPTION } from '../base-command-options';

export enum InfractionCommands {
  ADD_INFRACTION = 'añadir-sancion',
}

async function buildInfractionOptions() {
  try {
    const apiUrl = `${process.env.URL_BACKEND}/config/infractions`;
    const response = await fetch(apiUrl);
    const data: Infraction[] = await response.json();
    console.log('Infraction data:', data);
    if (!data || !Array.isArray(data)) {
      throw new Error('Invalid infraction data format');
    }
    return [
      { ...USER_OPTION, required: true },
      {
        name: 'tipo',
        type: ApplicationCommandOptionType.String,
        description: 'Artículo a comprar',
        required: true,
        choices: data.map((infraction) => ({
          name: `${infraction.emoji} ${infraction.name}`,
          value: infraction.value.toString(),
        })),
      },
      {
        name: 'razon',
        type: ApplicationCommandOptionType.String,
        description: 'Razón de la sanción',
        required: true,
      },
    ];
  } catch (error) {
    console.error('Error fetching purchase options:', error);
    throw new Error('Error fetching purchase options');
  }
}

export const InfractionCommandData = {
  [InfractionCommands.ADD_INFRACTION]: {
    command: InfractionCommands.ADD_INFRACTION,
    description: 'Añade una sanción a un usuario',
    options: buildInfractionOptions,
  },
} as const;
