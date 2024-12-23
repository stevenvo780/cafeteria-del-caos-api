import {
  InteractionType,
  InteractionResponseType,
  APIUserInteractionDataResolved,
  APIUser,
  APIGuildMember,
  APIMessageComponentInteraction,
} from 'discord.js';

export { InteractionType, InteractionResponseType };

// Interfaces auxiliares para el manejo de comandos
export interface CommandOption {
  name: string;
  type: number;
  value?: string | number | boolean;
  user?: APIUser;
  member?: APIGuildMember;
}

export interface CommandInteractionData {
  name: string;
  options?: CommandOption[];
  resolved?: APIUserInteractionDataResolved;
}

// Tipos específicos para nuestro uso
export interface DiscordUserData {
  id: string;
  username: string;
  nickname?: string;
  roles: string[];
  discordData: any;
}

export type MessageComponentInteraction = APIMessageComponentInteraction;
