import { REST, Routes, ApplicationCommandOptionType } from 'discord.js';
import { config } from 'dotenv';
config();

export async function registerDiscordCommands() {
  const commands = [
    {
      name: 'puntaje',
      description: 'Consulta los puntos de penalización',
      options: [
        {
          name: 'usuario',
          type: ApplicationCommandOptionType.User,
          description:
            'Usuario del que quieres consultar los puntos (opcional)',
          required: false,
        },
      ],
    },
    {
      name: 'saldo',
      description: 'Consulta tu balance de monedas del caos',
      options: [
        {
          name: 'usuario',
          type: ApplicationCommandOptionType.User,
          description: 'Usuario del que quieres consultar el saldo (opcional)',
          required: false,
        },
      ],
    },
    {
      name: 'crear-nota',
      description: 'Crea una nota pública en la librería',
      options: [
        {
          name: 'titulo',
          type: ApplicationCommandOptionType.String,
          description: 'El título de la nota',
          required: true,
        },
        {
          name: 'contenido',
          type: ApplicationCommandOptionType.String,
          description: 'El contenido de la nota',
          required: true,
        },
      ],
    },
    {
      name: 'añadir-puntos',
      description: 'Añade puntos de penalización a un usuario',
      options: [
        {
          name: 'usuario',
          type: ApplicationCommandOptionType.User,
          description: 'El usuario al que añadir puntos',
          required: true,
        },
        {
          name: 'puntos',
          type: ApplicationCommandOptionType.Integer,
          description: 'Cantidad de puntos a añadir',
          required: true,
          min_value: 1,
        },
      ],
    },
    {
      name: 'quitar-puntos',
      description: 'Quita puntos de penalización a un usuario',
      options: [
        {
          name: 'usuario',
          type: ApplicationCommandOptionType.User,
          description: 'El usuario al que quitar puntos',
          required: true,
        },
        {
          name: 'puntos',
          type: ApplicationCommandOptionType.Integer,
          description: 'Cantidad de puntos a quitar',
          required: true,
          min_value: 1,
        },
      ],
    },
    {
      name: 'establecer-puntos',
      description: 'Establece una cantidad específica de puntos a un usuario',
      options: [
        {
          name: 'usuario',
          type: ApplicationCommandOptionType.User,
          description: 'El usuario al que establecer los puntos',
          required: true,
        },
        {
          name: 'puntos',
          type: ApplicationCommandOptionType.Integer,
          description: 'Cantidad de puntos a establecer',
          required: true,
          min_value: 0,
        },
      ],
    },
    {
      name: 'dar-monedas',
      description: 'Da monedas a un usuario',
      options: [
        {
          name: 'usuario',
          type: ApplicationCommandOptionType.User,
          description: 'El usuario que recibirá las monedas',
          required: true,
        },
        {
          name: 'cantidad',
          type: ApplicationCommandOptionType.Integer,
          description: 'Cantidad de monedas a dar',
          required: true,
          min_value: 1,
        },
      ],
    },
    {
      name: 'quitar-monedas',
      description: 'Quita monedas a un usuario',
      options: [
        {
          name: 'usuario',
          type: ApplicationCommandOptionType.User,
          description: 'El usuario al que quitar monedas',
          required: true,
        },
        {
          name: 'cantidad',
          type: ApplicationCommandOptionType.Integer,
          description: 'Cantidad de monedas a quitar',
          required: true,
          min_value: 1,
        },
      ],
    },
    {
      name: 'establecer-monedas',
      description: 'Establece una cantidad específica de monedas a un usuario',
      options: [
        {
          name: 'usuario',
          type: ApplicationCommandOptionType.User,
          description: 'El usuario al que establecer las monedas',
          required: true,
        },
        {
          name: 'cantidad',
          type: ApplicationCommandOptionType.Integer,
          description: 'Cantidad de monedas a establecer',
          required: true,
          min_value: 0,
        },
      ],
    },
    {
      name: 'transferir-monedas',
      description: 'Transfiere monedas a otro usuario',
      options: [
        {
          name: 'usuario',
          type: ApplicationCommandOptionType.User,
          description: 'El usuario que recibirá las monedas',
          required: true,
        },
        {
          name: 'cantidad',
          type: ApplicationCommandOptionType.Integer,
          description: 'Cantidad de monedas a transferir',
          required: true,
          min_value: 1,
        },
      ],
    },
    {
      name: 'top-monedas',
      description: 'Muestra el top 10 de usuarios con más monedas',
    },
    {
      name: 'experiencia',
      description: 'Consulta tu experiencia acumulada',
      options: [
        {
          name: 'usuario',
          type: ApplicationCommandOptionType.User,
          description:
            'Usuario del que quieres consultar la experiencia (opcional)',
          required: false,
        },
      ],
    },
    {
      name: 'dar-experiencia',
      description: 'Da experiencia a un usuario',
      options: [
        {
          name: 'usuario',
          type: ApplicationCommandOptionType.User,
          description: 'El usuario que recibirá la experiencia',
          required: true,
        },
        {
          name: 'cantidad',
          type: ApplicationCommandOptionType.Integer,
          description: 'Cantidad de experiencia a dar',
          required: true,
          min_value: 1,
        },
      ],
    },
    {
      name: 'quitar-experiencia',
      description: 'Quita experiencia a un usuario',
      options: [
        {
          name: 'usuario',
          type: ApplicationCommandOptionType.User,
          description: 'El usuario al que quitar experiencia',
          required: true,
        },
        {
          name: 'cantidad',
          type: ApplicationCommandOptionType.Integer,
          description: 'Cantidad de experiencia a quitar',
          required: true,
          min_value: 1,
        },
      ],
    },
    {
      name: 'establecer-experiencia',
      description:
        'Establece una cantidad específica de experiencia a un usuario',
      options: [
        {
          name: 'usuario',
          type: ApplicationCommandOptionType.User,
          description: 'El usuario al que establecer la experiencia',
          required: true,
        },
        {
          name: 'cantidad',
          type: ApplicationCommandOptionType.Integer,
          description: 'Cantidad de experiencia a establecer',
          required: true,
          min_value: 0,
        },
      ],
    },
    {
      name: 'top-experiencia',
      description: 'Muestra el top 10 de usuarios con más experiencia',
    },
    {
      name: 'comprar',
      description: 'Compra un artículo de la tienda',
      options: [
        {
          name: 'articulo',
          type: ApplicationCommandOptionType.String,
          description: 'ID del artículo a comprar',
          required: true,
        },
        {
          name: 'cantidad',
          type: ApplicationCommandOptionType.Integer,
          description: 'Cantidad a comprar',
          required: true,
          min_value: 1,
        },
      ],
    },
    {
      name: 'añadir-sancion',
      description: 'Añade una sanción a un usuario',
      options: [
        {
          name: 'usuario',
          type: ApplicationCommandOptionType.User,
          description: 'El usuario a sancionar',
          required: true,
        },
        {
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
        {
          name: 'razon',
          type: ApplicationCommandOptionType.String,
          description: 'Razón de la sanción',
          required: true,
        },
      ],
    },
  ];

  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    throw new Error('DISCORD_BOT_TOKEN is not defined');
  }

  const rest = new REST({ version: '10' }).setToken(token);

  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) {
    throw new Error('DISCORD_CLIENT_ID is not defined');
  }

  try {
    await rest.put(Routes.applicationCommands(clientId), {
      body: commands,
    });
    console.info('Commands registered successfully');
  } catch (error) {
    console.error('Error registering commands or setting up webhooks:', error);
    throw error;
  }
  console.info('Successfully reloaded application');
}

registerDiscordCommands();
