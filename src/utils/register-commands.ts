import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';
import fetch from 'node-fetch';
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
  // Obtener productos del backend
  const apiUrl = `${process.env.URL_BACKEND}/products`;
  const productResponse = await fetch(apiUrl);
  const { products } = await productResponse.json();

  // Mapear productos a opciones de comando
  const productOptions = products.map((item: any) => ({
    name: `${item.title} (${item.currentPrice} monedas)`,
    value: String(item.id),
    description: item.description,
  }));

  // Construir comandos incluyendo los dinámicos
  const commands = buildCommandsList(productOptions);

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
