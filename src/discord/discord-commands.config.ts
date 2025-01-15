import { ApplicationCommandOptionType } from 'discord.js';

export enum PointsCommands {
  GET_POINTS = 'puntaje',
  ADD_POINTS = 'añadir-puntos',
  REMOVE_POINTS = 'quitar-puntos',
  SET_POINTS = 'establecer-puntos',
}

export enum CoinsCommands {
  GET_BALANCE = 'saldo',
  TOP_COINS = 'top-monedas',
  GIVE_COINS = 'dar-monedas',
  REMOVE_COINS = 'quitar-monedas',
  SET_COINS = 'establecer-monedas',
  TRANSFER_COINS = 'transferir-monedas',
  PURCHASE = 'comprar',
}

export enum ExperienceCommands {
  GET_EXPERIENCE = 'experiencia',
  TOP_EXPERIENCE = 'top-experiencia',
  GIVE_EXPERIENCE = 'dar-experiencia',
  REMOVE_EXPERIENCE = 'quitar-experiencia',
  SET_EXPERIENCE = 'establecer-experiencia',
}

export enum NotesCommands {
  CREATE_NOTE = 'crear-nota',
  EDIT_NOTE = 'editar-nota',
  DELETE_NOTE = 'borrar-nota',
  VIEW_NOTES = 'ver-notas',
}

export enum InfractionCommands {
  ADD_INFRACTION = 'añadir-sancion',
  ADD_INFRACTION_ALT = 'agregar-sancion',
  REMOVE_INFRACTION = 'quitar-sancion',
}

export const CommandCategories = {
  POINTS: 'POINTS',
  COINS: 'COINS',
  EXPERIENCE: 'EXPERIENCE',
  NOTES: 'NOTES',
  INFRACTION: 'INFRACTION',
  ADMIN: 'ADMIN',
} as const;

export type Category = keyof typeof CommandCategories;

const CommandOptions = {
  USER: {
    name: 'usuario',
    type: ApplicationCommandOptionType.User,
    description: 'Usuario objetivo',
    required: false,
  },

  POINTS: {
    name: 'puntos',
    type: ApplicationCommandOptionType.Integer,
    description: 'Cantidad de puntos',
    min_value: 0,
    required: true,
  },

  COINS: {
    name: 'cantidad',
    type: ApplicationCommandOptionType.Integer,
    description: 'Cantidad de monedas',
    min_value: 1,
    required: true,
  },

  EXPERIENCE: {
    name: 'cantidad',
    type: ApplicationCommandOptionType.Integer,
    description: 'Cantidad de experiencia',
    min_value: 0,
    required: true,
  },

  TITLE: {
    name: 'titulo',
    type: ApplicationCommandOptionType.String,
    description: 'Título de la nota',
    required: true,
  },

  CONTENT: {
    name: 'contenido',
    type: ApplicationCommandOptionType.String,
    description: 'Contenido de la nota',
    required: true,
  },

  ID: {
    name: 'id',
    type: ApplicationCommandOptionType.String,
    description: 'ID de la nota',
    required: true,
  },

  QUANTITY: {
    name: 'cantidad',
    type: ApplicationCommandOptionType.Integer,
    description: 'Cantidad a comprar',
    required: true,
    min_value: 1,
  },

  ARTICLE: {
    name: 'articulo',
    type: ApplicationCommandOptionType.String,
    description: 'Artículo a comprar',
    required: true,
  },

  REASON: {
    name: 'razon',
    type: ApplicationCommandOptionType.String,
    description: 'Razón de la sanción',
    required: true,
  },

  INFRACTION_TYPE: {
    name: 'tipo',
    type: ApplicationCommandOptionType.String,
    description: 'Tipo de sanción',
    required: true,
    choices: [
      {
        name: '◼️ Negro - Violencia extrema/Doxing/CP/Estafas (10 puntos)',
        value: 'BLACK',
      },
      {
        name: '♦️ Rojo - NSFW/Acoso grave/Suplantación (5 puntos)',
        value: 'RED',
      },
      {
        name: '🔶 Naranja - Insultos/Amenazas/Odio (3 puntos)',
        value: 'ORANGE',
      },
      {
        name: '☢️ Amarillo - Discriminación leve/Spam (2 puntos)',
        value: 'YELLOW',
      },
    ],
  },
} as const;

const CommonCommandOptions = {
  VIEW: [CommandOptions.USER],

  MODIFY_POINTS: [
    { ...CommandOptions.USER, required: true },
    CommandOptions.POINTS,
  ],

  MODIFY_COINS: [
    { ...CommandOptions.USER, required: true },
    CommandOptions.COINS,
  ],

  MODIFY_EXPERIENCE: [
    { ...CommandOptions.USER, required: true },
    CommandOptions.EXPERIENCE,
  ],

  CREATE_NOTE: [CommandOptions.TITLE, CommandOptions.CONTENT],

  EDIT_NOTE: [
    CommandOptions.ID,
    { ...CommandOptions.TITLE, required: false },
    { ...CommandOptions.CONTENT, required: false },
  ],

  DELETE_NOTE: [CommandOptions.ID],

  PURCHASE: [CommandOptions.ARTICLE, CommandOptions.QUANTITY],

  INFRACTION: [
    {
      ...CommandOptions.USER,
      description: 'Usuario a sancionar',
      required: true,
    },
    CommandOptions.INFRACTION_TYPE,
    CommandOptions.REASON,
  ],

  REMOVE_INFRACTION: [
    { ...CommandOptions.USER, required: true },
    CommandOptions.ID,
  ],

  EMPTY: [],
} as const;

export const DiscordCommandOptions = {
  [PointsCommands.GET_POINTS]: CommonCommandOptions.VIEW,
  [PointsCommands.ADD_POINTS]: CommonCommandOptions.MODIFY_POINTS,
  [PointsCommands.REMOVE_POINTS]: CommonCommandOptions.MODIFY_POINTS,
  [PointsCommands.SET_POINTS]: CommonCommandOptions.MODIFY_POINTS,

  [ExperienceCommands.GET_EXPERIENCE]: CommonCommandOptions.VIEW,
  [ExperienceCommands.TOP_EXPERIENCE]: CommonCommandOptions.EMPTY,
  [ExperienceCommands.GIVE_EXPERIENCE]: CommonCommandOptions.MODIFY_EXPERIENCE,
  [ExperienceCommands.REMOVE_EXPERIENCE]:
    CommonCommandOptions.MODIFY_EXPERIENCE,
  [ExperienceCommands.SET_EXPERIENCE]: CommonCommandOptions.MODIFY_EXPERIENCE,

  [NotesCommands.CREATE_NOTE]: CommonCommandOptions.CREATE_NOTE,
  [NotesCommands.EDIT_NOTE]: CommonCommandOptions.EDIT_NOTE,
  [NotesCommands.DELETE_NOTE]: CommonCommandOptions.DELETE_NOTE,
  [NotesCommands.VIEW_NOTES]: CommonCommandOptions.VIEW,

  [CoinsCommands.GET_BALANCE]: CommonCommandOptions.VIEW,
  [CoinsCommands.TOP_COINS]: CommonCommandOptions.EMPTY,
  [CoinsCommands.GIVE_COINS]: CommonCommandOptions.MODIFY_COINS,
  [CoinsCommands.REMOVE_COINS]: CommonCommandOptions.MODIFY_COINS,
  [CoinsCommands.SET_COINS]: CommonCommandOptions.MODIFY_COINS,
  [CoinsCommands.TRANSFER_COINS]: CommonCommandOptions.MODIFY_COINS,
  [CoinsCommands.PURCHASE]: CommonCommandOptions.PURCHASE,

  [InfractionCommands.ADD_INFRACTION]: CommonCommandOptions.INFRACTION,
  [InfractionCommands.ADD_INFRACTION_ALT]: CommonCommandOptions.INFRACTION,
  [InfractionCommands.REMOVE_INFRACTION]:
    CommonCommandOptions.REMOVE_INFRACTION,
} as const;

export const DISCORD_COMMANDS = {
  [CommandCategories.POINTS]: {
    commands: Object.values(PointsCommands) as string[],
    descriptions: {
      [PointsCommands.GET_POINTS]: 'Consulta los puntos de penalización',
      [PointsCommands.ADD_POINTS]: 'Añade puntos de penalización a un usuario',
      [PointsCommands.REMOVE_POINTS]:
        'Quita puntos de penalización a un usuario',
      [PointsCommands.SET_POINTS]:
        'Establece una cantidad específica de puntos a un usuario',
    },
  },
  [CommandCategories.COINS]: {
    commands: Object.values(CoinsCommands) as string[],
    descriptions: {
      [CoinsCommands.GET_BALANCE]: 'Consulta tu balance de monedas del caos',
      [CoinsCommands.TOP_COINS]:
        'Muestra el top 10 de usuarios con más monedas',
      [CoinsCommands.GIVE_COINS]: 'Da monedas a un usuario',
      [CoinsCommands.REMOVE_COINS]: 'Quita monedas a un usuario',
      [CoinsCommands.SET_COINS]:
        'Establece una cantidad específica de monedas a un usuario',
      [CoinsCommands.TRANSFER_COINS]: 'Transfiere monedas a otro usuario',
      [CoinsCommands.PURCHASE]: 'Compra un artículo de la tienda',
    },
  },
  [CommandCategories.EXPERIENCE]: {
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
  },
  [CommandCategories.NOTES]: {
    commands: Object.values(NotesCommands) as string[],
    descriptions: {
      [NotesCommands.CREATE_NOTE]: 'Crea una nota pública en la librería',
      [NotesCommands.EDIT_NOTE]: 'Edita una nota existente',
      [NotesCommands.DELETE_NOTE]: 'Elimina una nota',
      [NotesCommands.VIEW_NOTES]: 'Ver notas',
    },
  },
  [CommandCategories.INFRACTION]: {
    commands: Object.values(InfractionCommands) as string[],
    descriptions: {
      [InfractionCommands.ADD_INFRACTION]: 'Añade una sanción a un usuario',
      [InfractionCommands.ADD_INFRACTION_ALT]:
        'Añade una sanción a un usuario (alternativo)',
      [InfractionCommands.REMOVE_INFRACTION]: 'Elimina una sanción',
    },
  },
} as const;

export const buildCommandsList = (productOptions: any[]) => {
  const commands = [];

  for (const [category, config] of Object.entries(DISCORD_COMMANDS)) {
    for (const commandName of config.commands) {
      if (commandName === CoinsCommands.PURCHASE) continue;

      const command: any = {
        name: commandName,
        description:
          config.descriptions[commandName] ||
          `Comando de ${category.toLowerCase()}`,
        options: DiscordCommandOptions[commandName] || [],
      };
      commands.push(command);
    }
  }

  if (productOptions?.length > 0) {
    commands.push({
      name: CoinsCommands.PURCHASE,
      description:
        DISCORD_COMMANDS[CommandCategories.COINS].descriptions[
          CoinsCommands.PURCHASE
        ],
      options: [
        {
          name: 'articulo',
          type: ApplicationCommandOptionType.String,
          description: 'Artículo a comprar',
          required: true,
          choices: productOptions,
        },
        {
          name: 'cantidad',
          type: ApplicationCommandOptionType.Integer,
          description: 'Cantidad a comprar',
          required: true,
          min_value: 1,
        },
      ],
    });
  }

  return commands;
};

export const getCommandCategory = (commandName: string): Category | null => {
  for (const [category, config] of Object.entries(DISCORD_COMMANDS)) {
    if (config.commands.includes(commandName)) {
      return category as Category;
    }
  }
  return null;
};
