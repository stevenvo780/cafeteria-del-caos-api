import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';
import { buildCommandsList } from '../discord/discord-commands.config';
config();

export interface Product {
  id: number;
  title: string;
  description: string;
  basePrice: string;
  currentPrice: string;
  stock: number | null;
}

export async function registerDiscordCommands() {
  const commands = buildCommandsList();

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
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.info('Commands registered successfully');
  } catch (error) {
    console.error('Error registering commands:', error);
    throw error;
  }
}

registerDiscordCommands();
