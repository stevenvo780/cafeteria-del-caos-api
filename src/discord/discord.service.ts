import { Injectable, HttpException } from '@nestjs/common';
import {
  CommandOption,
  InteractPoints,
  InteractCoins,
  DiscordCommandResponse,
  ErrorResponse,
} from './discord.types';
import {
  InteractionResponseType,
  APIInteraction,
  APIChatInputApplicationCommandInteractionData,
  APIInteractionDataResolvedGuildMember,
  APIApplicationCommandInteractionDataNumberOption,
  APIApplicationCommandInteractionDataUserOption,
  APIUser,
} from 'discord.js';
import {
  getGuildMemberCount,
  getOnlineMemberCount,
} from '../utils/discord-utils';
import { LibraryService } from '../library/library.service';
import { UserDiscordService } from '../user-discord/user-discord.service';
import * as nacl from 'tweetnacl';

@Injectable()
export class DiscordService {
  private readonly guildId = process.env.DISCORD_GUILD_ID;

  constructor(
    private readonly libraryService: LibraryService,
    private readonly userDiscordService: UserDiscordService,
  ) {}

  verifyDiscordRequest(
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

  async getGuildMemberCount(): Promise<number> {
    try {
      return await getGuildMemberCount(this.guildId);
    } catch (error) {
      throw new HttpException('Failed to fetch guild member count', 500);
    }
  }

  async getOnlineMemberCount(): Promise<number> {
    try {
      return await getOnlineMemberCount(this.guildId);
    } catch (error) {
      throw new HttpException('Failed to fetch online member count', 500);
    }
  }

  private errorResponse(message: string): ErrorResponse {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: { content: message },
      isError: true,
    };
  }

  async handleCreateNote(
    options: CommandOption[],
  ): Promise<DiscordCommandResponse> {
    try {
      const titulo = options.find((opt) => opt.name === 'titulo')
        ?.value as string;
      const contenido = options.find((opt) => opt.name === 'contenido')
        ?.value as string;

      if (!titulo || !contenido) {
        return {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content:
              'Ah, la ignorancia... ¿Pretendías crear una nota sin su esencia básica?',
          },
        };
      }

      const data = {
        title: titulo,
        description: contenido,
        referenceDate: new Date(),
      };

      const note = await this.libraryService.create(data, null);
      const truncatedContent =
        contenido.length > 1000
          ? contenido.substring(0, 1000) + '...'
          : contenido;

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: `La sabiduría ha sido plasmada en el vacío digital\n${process.env.FRONT_URL}/library/${note.id}\n\nHe aquí la verdad revelada:\n${truncatedContent}`,
        },
      };
    } catch (error) {
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: 'El caos ha engullido tu nota. La nada prevalece',
        },
      };
    }
  }

  async handleWebhook(event: any): Promise<void> {
    console.log('Received webhook event:', event);
  }

  async handleUserPoints(
    commandName: string,
    commandData: APIChatInputApplicationCommandInteractionData,
  ): Promise<DiscordCommandResponse> {
    const validation = await this.validatePointsCommand(commandData);
    if ('error' in validation) {
      return validation.error;
    }

    switch (commandName) {
      case 'añadir-puntos':
        return await this.userDiscordService.handleAddPoints(validation);
      case 'quitar-puntos':
        return await this.userDiscordService.handleRemovePoints(validation);
      case 'establecer-puntos':
        return await this.userDiscordService.handleSetPoints(validation);
      default:
        return {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: { content: 'Comando de puntos no reconocido' },
        };
    }
  }

  async handleUserCoins(
    commandName: string,
    commandData: APIChatInputApplicationCommandInteractionData,
    interactionPayload: APIInteraction,
  ): Promise<DiscordCommandResponse> {
    const isTransfer = commandName === 'transferir-monedas';
    const validation = await this.validateCoinsCommand(
      commandData,
      interactionPayload,
      isTransfer,
    );

    if ('error' in validation) {
      return validation.error;
    }

    const operationMap = {
      'dar-monedas': 'add',
      'quitar-monedas': 'remove',
      'establecer-monedas': 'set',
      'transferir-monedas': 'transfer',
    } as const;

    return await this.userDiscordService.handleCoinsOperation(
      validation,
      operationMap[commandName],
    );
  }

  async handleUserBalance(
    commandData: APIChatInputApplicationCommandInteractionData,
    interactionMember: any,
  ): Promise<DiscordCommandResponse> {
    const userOption = commandData.options?.find(
      (opt) => opt.name === 'usuario',
    ) as any;

    const targetUser = await this.resolveTargetUser(
      userOption,
      commandData,
      interactionMember,
    );
    if ('error' in targetUser) {
      return this.errorResponse(
        '❌ Error: No se encontró al usuario especificado.',
      );
    }

    const topUsers = await this.userDiscordService.findTopByCoins(10);
    const userRank = topUsers.findIndex((u) => u.id === targetUser.id) + 1;
    const rankText =
      userRank > 0 && userRank <= 10
        ? `\n🏆 Ranking: #${userRank} en el top 10`
        : '';

    const message = userOption
      ? `💰 ${targetUser.username} tiene ${targetUser.coins} monedas del caos!${rankText}`
      : `💰 ¡${targetUser.username}! Tu fortuna asciende a ${targetUser.coins} monedas del caos!${rankText}`;

    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: { content: message },
    };
  }

  async handleUserScore(
    commandData: APIChatInputApplicationCommandInteractionData,
    interactionMember: any,
  ): Promise<DiscordCommandResponse> {
    const userOption = commandData.options?.find(
      (opt) => opt.name === 'usuario',
    ) as any;

    const targetUser = await this.resolveTargetUser(
      userOption,
      commandData,
      interactionMember,
    );
    if ('error' in targetUser) {
      throw targetUser.error;
    }

    const message = userOption
      ? `🎯 ${targetUser.username} tiene ${targetUser.points} puntos de penalización en su historial del CAOS!`
      : `🎯 ¡${targetUser.username}! Cargas con ${targetUser.points} puntos de penalización en tu historial del CAOS!`;

    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: { content: message },
    };
  }

  async handleTopCoins(): Promise<DiscordCommandResponse> {
    const topUsers = await this.userDiscordService.findTopByCoins(10);
    if (!topUsers || topUsers.length === 0) {
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: 'No hay usuarios o monedas registradas.' },
      };
    }

    const response = ['💰 Top 10 usuarios con más monedas:']
      .concat(
        topUsers.map((u, i) => `#${i + 1} ${u.username} - ${u.coins} monedas`),
      )
      .join('\n');

    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: { content: response },
    };
  }

  private async resolveTargetUser(
    userOption: any,
    commandData: any,
    interactionMember: any,
  ) {
    if (userOption) {
      const resolvedUser = commandData.resolved?.users?.[userOption.value];
      const resolvedMember = commandData.resolved?.members?.[userOption.value];

      if (!resolvedUser || !resolvedMember) {
        return {
          error: {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: '❌ Error: No se encontró al usuario especificado.',
            },
          },
        };
      }

      return await this.userDiscordService.findOrCreate({
        id: userOption.value,
        username: resolvedUser.username,
        roles: resolvedMember.roles || [],
      });
    }

    return await this.userDiscordService.findOrCreate({
      id: interactionMember.user.id,
      username: interactionMember.user.username,
      roles: interactionMember.roles || [],
    });
  }

  private async validatePointsCommand(
    commandData: APIChatInputApplicationCommandInteractionData,
  ): Promise<InteractPoints | { error: any }> {
    const userOption = commandData.options?.find(
      (opt) => opt.name === 'usuario',
    ) as APIApplicationCommandInteractionDataUserOption;

    const pointsOption = commandData.options?.find(
      (opt) => opt.name === 'puntos',
    ) as APIApplicationCommandInteractionDataNumberOption;

    if (!userOption || !pointsOption) {
      return {
        error: {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content:
              'La estupidez humana se manifiesta... ¿Dónde están los datos fundamentales?',
          },
        },
      };
    }

    const userId = userOption.value;
    const points = pointsOption.value;

    const resolvedUser = commandData.resolved?.users?.[userId] as APIUser;
    const resolvedMember = commandData.resolved?.members?.[
      userId
    ] as APIInteractionDataResolvedGuildMember;

    if (!resolvedUser || !resolvedMember) {
      return {
        error: {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: '¡NO ENCUENTRO A ESE USUARIO, PEDAZO DE ALCORNOQUE!',
          },
        },
      };
    }

    try {
      await this.userDiscordService.findOrCreate({
        id: userId,
        username: resolvedUser.username,
        roles: resolvedMember.roles || [],
      });

      return {
        userId,
        points,
        username: resolvedUser.username,
        roles: resolvedMember.roles || [],
      };
    } catch (error) {
      console.error('Error al procesar usuario objetivo:', error);
      return {
        error: {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: 'Error al procesar usuario objetivo: ' + error.message,
          },
        },
      };
    }
  }

  private async validateCoinsCommand(
    commandData: APIChatInputApplicationCommandInteractionData,
    interactionPayload: APIInteraction,
    isTransfer = false,
  ): Promise<InteractCoins | { error: any }> {
    const userOption = commandData.options?.find(
      (opt) => opt.name === (isTransfer ? 'usuario' : 'usuario'),
    ) as APIApplicationCommandInteractionDataUserOption;

    const coinsOption = commandData.options?.find(
      (opt) => opt.name === (isTransfer ? 'cantidad' : 'cantidad'),
    ) as APIApplicationCommandInteractionDataNumberOption;

    if (!userOption || !coinsOption) {
      return {
        error: {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content:
              'Ah, la mediocridad... ¿Las monedas viajan sin destino ni cantidad?',
          },
        },
      };
    }

    const userId = userOption.value;
    const coins = coinsOption.value;

    const resolvedUser = commandData.resolved?.users?.[userId] as APIUser;
    const resolvedMember = commandData.resolved?.members?.[
      userId
    ] as APIInteractionDataResolvedGuildMember;

    if (!resolvedUser || !resolvedMember) {
      return {
        error: {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content:
              'Error: No se pudo resolver el usuario o miembro especificado.',
          },
        },
      };
    }

    const result: InteractCoins = {
      userId: isTransfer ? interactionPayload.member.user.id : userId,
      targetId: isTransfer ? userId : undefined,
      coins,
      username: resolvedUser.username,
      roles: resolvedMember.roles || [],
    };

    // Asegurar que el usuario objetivo existe
    try {
      await this.userDiscordService.findOrCreate({
        id: isTransfer ? userId : result.userId,
        username: resolvedUser.username,
        roles: resolvedMember.roles || [],
      });

      return result;
    } catch (error) {
      console.error('Error al procesar usuario:', error);
      return {
        error: {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: { content: 'Error al procesar usuario: ' + error.message },
        },
      };
    }
  }
}
