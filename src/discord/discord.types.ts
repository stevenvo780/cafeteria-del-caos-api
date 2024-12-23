import {
  InteractionType,
  InteractionResponseType,
  APIUserInteractionDataResolved,
  APIUser,
  APIGuildMember,
  APIMessageComponentInteraction,
} from 'discord.js';

export { InteractionType, InteractionResponseType };

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

export interface DiscordUserData {
  id: string;
  username: string;
  roles: string[];
}

export interface InteractPoints {
  userId: string;
  points: number;
  username: string;
  roles: string[];
}

export interface InteractCoins {
  userId: string;
  targetId?: string;
  coins: number;
  username: string;
  roles: string[];
}

export type MessageComponentInteraction = APIMessageComponentInteraction;
