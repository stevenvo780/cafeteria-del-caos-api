import { InteractionResponseType } from 'discord.js';
import { ErrorResponse } from './discord.types';

export const createErrorResponse = (message: string): ErrorResponse => {
  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: { content: message },
    isError: true,
  };
};
