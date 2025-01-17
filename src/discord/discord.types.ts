import {
  InteractionType,
  InteractionResponseType,
  APIUserInteractionDataResolved,
  APIMessageComponentInteraction,
  APIChatInputApplicationCommandInteractionData,
  APIInteraction,
} from 'discord.js';
import { UserDiscord } from '../user-discord/entities/user-discord.entity';

export { InteractionType, InteractionResponseType };

export type CommandOption = {
  name: string;
  value: string | number | boolean;
  type: number;
  options?: CommandOption[];
};

export interface CommandInteractionData {
  name: string;
  options?: CommandOption[];
  resolved?: APIUserInteractionDataResolved;
}

export interface InteractPoints {
  user: UserDiscord;
  points: number;
}

export interface InteractExperience {
  user: UserDiscord;
  experience?: number;
}

export interface InteractCoins {
  user: UserDiscord;
  target?: UserDiscord | null;
  coins: number;
}

export type MessageComponentInteraction = APIMessageComponentInteraction;

export type CommandResponse = {
  type: typeof InteractionResponseType.ChannelMessageWithSource;
  data: {
    content: string;
    embeds?: any[];
    components?: any[];
  };
};

export type ErrorResponse = {
  type: typeof InteractionResponseType.ChannelMessageWithSource;
  data: {
    content: string;
    embeds?: any[];
    components?: any[];
  };
  isError: true;
};

export type ValidateResult<T> = T | ErrorResponse;

export type DiscordPingResponse = {
  type: InteractionResponseType.Pong;
};

export type DiscordInteractionResponse = CommandResponse | DiscordPingResponse;

export type CommandHandler = (
  commandData: APIChatInputApplicationCommandInteractionData,
  interactionPayload?: APIInteraction,
) => Promise<DiscordInteractionResponse>;
