import { REST, Routes, Client, TextChannel, NewsChannel } from 'discord.js';
import { config } from 'dotenv';
config();

export async function setupWebhook() {
  const client = new Client({
    intents: ['Guilds', 'GuildWebhooks'],
  });

  try {
    await client.login(process.env.DISCORD_BOT_TOKEN);
    const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
    const watchedChannels =
      process.env.DISCORD_WATCHED_CHANNELS?.split(',') || [];

    for (const channelId of watchedChannels) {
      const channel = await guild.channels.fetch(channelId);

      if (!(channel instanceof TextChannel || channel instanceof NewsChannel)) {
        console.error(`Channel ${channelId} is not a text or news channel`);
        continue;
      }

      const webhooks = await channel.fetchWebhooks();
      const existingWebhook = webhooks.find(
        (wh) => wh.name === 'Publicaciones',
      );

      if (!existingWebhook) {
        const botAvatarUrl = client.user?.displayAvatarURL();
        await channel.createWebhook({
          name: 'Publicaciones',
          avatar: botAvatarUrl,
        });
        console.log(`Created webhook for channel ${channel.name}`);
      }
    }

    console.log('Webhooks setup completed');
  } catch (error) {
    console.error('Error setting up webhooks:', error);
  } finally {
    client.destroy();
  }
}

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
    {
      name: 'dar-monedas',
      description: 'Da monedas a un usuario',
      options: [
        {
          name: 'usuario',
          type: 6,
          description: 'El usuario que recibirá las monedas',
          required: true,
        },
        {
          name: 'cantidad',
          type: 4,
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
          type: 6,
          description: 'El usuario al que quitar monedas',
          required: true,
        },
        {
          name: 'cantidad',
          type: 4,
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
          type: 6,
          description: 'El usuario al que establecer las monedas',
          required: true,
        },
        {
          name: 'cantidad',
          type: 4,
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
          type: 6,
          description: 'El usuario que recibirá las monedas',
          required: true,
        },
        {
          name: 'cantidad',
          type: 4,
          description: 'Cantidad de monedas a transferir',
          required: true,
          min_value: 1,
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
    await setupWebhook();
  } catch (error) {
    console.error('Error registering commands or setting up webhooks:', error);
    throw error;
  }
  console.info('Successfully reloaded application');
}

registerDiscordCommands();
