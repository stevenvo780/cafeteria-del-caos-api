import { REST, Routes } from 'discord.js';

export async function registerDiscordCommands() {
  const commands = [
    {
      name: 'crear-nota',
      description: 'Crea una nota pública en la librería',
      options: [
        {
          name: 'titulo',
          type: 3,
          description: 'El título de la nota',
          required: true,
        },
        {
          name: 'contenido',
          type: 3,
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
          type: 6,
          description: 'El usuario al que añadir puntos',
          required: true,
        },
        {
          name: 'puntos',
          type: 4,
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
          type: 6,
          description: 'El usuario al que quitar puntos',
          required: true,
        },
        {
          name: 'puntos',
          type: 4,
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
          type: 6,
          description: 'El usuario al que establecer los puntos',
          required: true,
        },
        {
          name: 'puntos',
          type: 4,
          description: 'Cantidad de puntos a establecer',
          required: true,
          min_value: 0,
        },
      ],
    },
  ];

  const rest = new REST({ version: '10' }).setToken(
    process.env.DISCORD_BOT_TOKEN,
  );

  try {
    await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), {
      body: commands,
    });

    console.info('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
}
