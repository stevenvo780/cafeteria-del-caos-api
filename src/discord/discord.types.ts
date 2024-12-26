import {
  InteractionType,
  InteractionResponseType,
  APIUserInteractionDataResolved,
  APIMessageComponentInteraction,
} from 'discord.js';

export { InteractionType, InteractionResponseType };

export type CommandOption = {
  name: string;
  value: string | number;
};

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

export type DiscordCommandResponse = {
  type: InteractionResponseType.ChannelMessageWithSource;
  data: {
    content: string;
    embeds?: any[];
    components?: any[];
  };
};

export type ErrorResponse = DiscordCommandResponse & {
  isError: true;
};

export type DiscordPingResponse = {
  type: InteractionResponseType.Pong;
};

export type DiscordInteractionResponse =
  | DiscordCommandResponse
  | DiscordPingResponse;
