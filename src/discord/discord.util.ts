import { InteractionResponseType } from 'discord.js';
import { ErrorResponse, ValidateResult } from './discord.types';
import * as nacl from 'tweetnacl';
import { UserDiscord } from 'src/user-discord/entities/user-discord.entity';

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

export async function resolveTargetUser(
  userDiscordService: any,
  userOption: any,
  commandData: any,
  interactionMember: any,
): Promise<ValidateResult<UserDiscord>> {
  if (userOption) {
    const resolvedUser = commandData.resolved?.users?.[userOption.value];
    const resolvedMember = commandData.resolved?.members?.[userOption.value];

    if (!resolvedUser || !resolvedMember) {
      return createErrorResponse('❌ No se encontró al usuario especificado.');
    }

    return await userDiscordService.findOrCreate({
      id: userOption.value,
      username: resolvedUser.username,
      roles: resolvedMember.roles || [],
    });
  }

  return await userDiscordService.findOrCreate({
    id: interactionMember.user.id,
    username: interactionMember.user.username,
    roles: interactionMember.roles || [],
  });
}
