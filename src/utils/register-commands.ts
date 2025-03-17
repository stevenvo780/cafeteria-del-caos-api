import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';
import * as path from 'path';
import { buildCommandsList } from '../discord/discord-commands.config';

config({ path: path.resolve(__dirname, '../../.env') });

export interface Product {
  id: number;
  title: string;
  description: string;
  basePrice: string;
  currentPrice: string;
  stock: number | null;
}

async function registerDiscordCommands() {
  try {
    const commands = await buildCommandsList();

    const token = process.env.DISCORD_BOT_TOKEN;
    const clientId = process.env.DISCORD_CLIENT_ID;

    if (!token || !clientId) {
      throw new Error(
        'Las variables de entorno DISCORD_BOT_TOKEN o DISCORD_CLIENT_ID no están definidas',
      );
    }

    const rest = new REST({ version: '10' }).setToken(token);

    console.log('Iniciando registro de comandos...');
    await rest.put(Routes.applicationCommands(clientId), {
      body: commands,
    });
    console.log('Comandos registrados exitosamente');
  } catch (error) {
    console.error('Error al registrar comandos:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  registerDiscordCommands().catch(console.error);
}

export { registerDiscordCommands };
