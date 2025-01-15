import { InteractionResponseType } from 'discord.js';
import { ErrorResponse } from './discord.types';


export const createErrorResponse = (message: string): ErrorResponse => {
  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: { content: message },
    isError: true,
  };
};

export function verifyDiscordRequest(
  signature: string,
  timestamp: string,
  body: any,
): boolean {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  return nacl.sign.detached.verify(
    Buffer.from(timestamp + JSON.stringify(body)),
    Buffer.from(signature, 'hex'),
    Buffer.from(publicKey, 'hex'),
  );
}
