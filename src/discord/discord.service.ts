import { Injectable, HttpException } from '@nestjs/common';
import {
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
  APIApplicationCommandInteractionDataOption,
  APIApplicationCommandInteractionDataStringOption,
} from 'discord.js';
import {
  getGuildMemberCount,
  getOnlineMemberCount,
} from '../utils/discord-utils';
import { LibraryService } from '../library/library.service';
import { UserDiscordService } from '../user-discord/user-discord.service';
import { LibraryVisibility } from '../library/entities/library.entity';
import * as nacl from 'tweetnacl';
import { KardexService } from '../kardex/kardex.service';
import { ProductService } from '../product/product.service';

@Injectable()
export class DiscordService {
  private readonly guildId = process.env.DISCORD_GUILD_ID;

  constructor(
    private readonly libraryService: LibraryService,
    private readonly userDiscordService: UserDiscordService,
    private readonly kardexService: KardexService, // <-- Inyectamos KardexService
    private readonly productService: ProductService, // Añadir esta línea
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
      type: InteractionResponseType.ChannelMessageWithSource as const,
      data: { content: message },
      isError: true,
    };
  }

  async handleCreateNote(
    options: APIApplicationCommandInteractionDataOption[],
    userId: string,
    username: string,
  ): Promise<DiscordCommandResponse> {
    try {
      const tituloOption = options.find((opt) => opt.name === 'titulo');
      const contenidoOption = options.find((opt) => opt.name === 'contenido');

      const titulo = this.getStringOptionValue(tituloOption);
      const contenido = this.getStringOptionValue(contenidoOption);

      if (!titulo || !contenido) {
        return {
          type: InteractionResponseType.ChannelMessageWithSource as const,
          data: {
            content:
              'Ah, la ignorancia... ¿Pretendías crear una nota sin su esencia básica?',
          },
        };
      }

      const rootFolder = await this.libraryService.findOrCreateByTitle(
        'Notas de Discord',
        LibraryVisibility.GENERAL,
      );

      const userFolder = await this.libraryService.findOrCreateByTitle(
        `Notas de ${username}`,
        LibraryVisibility.GENERAL,
        rootFolder,
      );

      const data = {
        title: titulo,
        description: contenido,
        referenceDate: new Date(),
        parent: userFolder,
        visibility: LibraryVisibility.GENERAL,
      };

      const note = await this.libraryService.create(data, null);

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: `La sabiduría ha sido plasmada\n${process.env.FRONT_URL}/library/${note.id}\n`,
        },
      };
    } catch (error) {
      console.error('Error creating note:', error);
      return {
        type: InteractionResponseType.ChannelMessageWithSource as const,
        data: {
          content: 'El caos ha engullido tu nota. La nada prevalece',
        },
      };
    }
  }

  private getStringOptionValue(
    option: APIApplicationCommandInteractionDataOption | undefined,
  ): string | null {
    if (!option || !('value' in option) || typeof option.value !== 'string') {
      return null;
    }
    return option.value;
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

    const { userId, targetId, coins, username, roles } = validation;
    const user = await this.userDiscordService.findOrCreate({
      id: userId,
      username,
      roles,
    });

    let message: string;
    try {
      switch (commandName) {
        case 'dar-monedas': {
          await this.kardexService.addCoins(userId, coins, 'Discord command');
          await this.userDiscordService.addExperience(userId, coins);
          const newBalance = await this.kardexService.getUserLastBalance(
            userId,
          );
          const user = await this.userDiscordService.findOne(userId);
          message = `💰 LLUVIA DE MONEDAS! ${user.username} +${coins}\nSaldo actual: ${newBalance} monedas.\n✨ También ganaste ${coins} puntos de experiencia!`;
          break;
        }
        case 'quitar-monedas': {
          await this.kardexService.removeCoins(
            userId,
            coins,
            'Discord command',
          );
          const newBalance = await this.kardexService.getUserLastBalance(
            userId,
          );
          message = `🔥 GET REKT ${user.username} -${coins} monedas.\nSaldo actual: ${newBalance} monedas.`;
          break;
        }
        case 'establecer-monedas': {
          await this.kardexService.setCoins(userId, coins, 'Discord command');
          const newBalance = await this.kardexService.getUserLastBalance(
            userId,
          );
          message = `⚡ ESTABLECIDO! ${user.username} ahora tiene ${newBalance} monedas.`;
          break;
        }
        case 'transferir-monedas': {
          if (!targetId) {
            return this.errorResponse('❌ Falta el usuario de destino.');
          }
          const toUser = await this.userDiscordService.findOrCreate({
            id: targetId,
            username: 'Unknown user',
          });
          await this.kardexService.transferCoins(userId, targetId, coins);

          const fromBalance = await this.kardexService.getUserLastBalance(
            userId,
          );
          const toBalance = await this.kardexService.getUserLastBalance(
            targetId,
          );

          message = `✨ ¡TRANSFERENCIA EXITOSA!\n\n💸 ${user.username} ha enviado ${coins} monedas a ${toUser.username}\n\n💰 Nuevos balances:\n${user.username}: ${fromBalance} monedas\n${toUser.username}: ${toBalance} monedas`;
          break;
        }
        default: {
          return this.errorResponse('Comando de monedas no reconocido.');
        }
      }
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: message },
      };
    } catch (error) {
      console.error('Error en operación de monedas:', error);
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: '💀 Error en la operación de monedas. Intenta de nuevo.',
        },
      };
    }
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
      return this.errorResponse('❌ Error: No se encontró al usuario.');
    }

    const lastBalance = await this.kardexService.getUserLastBalance(
      targetUser.id,
    );

    const topCoins = await this.kardexService.findTopByCoins(10);
    const userRank =
      topCoins.findIndex((item) => item.userDiscordId === targetUser.id) + 1;
    const rankText =
      userRank > 0 && userRank <= 10
        ? `\n🏆 Ranking: #${userRank} en el top 10`
        : '';

    const message = userOption
      ? `💰 ${targetUser.username} tiene ${lastBalance} monedas del caos!${rankText}`
      : `💰 ¡${targetUser.username}! Tu fortuna asciende a ${lastBalance} monedas del caos!${rankText}`;

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
    try {
      const topCoins = await this.kardexService.findTopByCoins(10);
      if (!topCoins || topCoins.length === 0) {
        return {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: { content: 'No hay usuarios con monedas registradas.' },
        };
      }

      const leaderboardLines = await Promise.all(
        topCoins.map(async (item, index) => {
          const user = await this.userDiscordService.findOne(
            item.userDiscordId,
          );
          const medal =
            index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '💰';
          return `${medal} #${index + 1} ${user.username} - ${
            item.total
          } monedas`;
        }),
      );

      const response = ['🏆 Top 10 usuarios con más monedas:']
        .concat(leaderboardLines)
        .join('\n');

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: response },
      };
    } catch (error) {
      console.error('Error al obtener ranking de monedas:', error);
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: '❌ Error al obtener el ranking de monedas.' },
      };
    }
  }

  async handleUserExperience(
    commandData: APIChatInputApplicationCommandInteractionData,
    member: any,
  ): Promise<DiscordCommandResponse> {
    const userOption = commandData.options?.find(
      (opt) => opt.name === 'usuario',
    ) as APIApplicationCommandInteractionDataUserOption;

    const targetUser = await this.resolveTargetUser(
      userOption,
      commandData,
      member,
    );

    if ('error' in targetUser) {
      return {
        type: InteractionResponseType.ChannelMessageWithSource as const,
        data: {
          content: '❌ Error: No se pudo encontrar al usuario especificado.',
        },
      };
    }

    const topUsers = await this.userDiscordService.findTopByExperience(10);
    const userRank = topUsers.findIndex((u) => u.id === targetUser.id) + 1;
    const rankText =
      userRank > 0 && userRank <= 10
        ? `\n🏆 Ranking: #${userRank} en el top 10`
        : '';

    const message = userOption
      ? `✨ ${targetUser.username} tiene ${targetUser.experience} puntos de experiencia!${rankText}`
      : `✨ ¡${targetUser.username}! Has acumulado ${targetUser.experience} XP!${rankText}`;

    return {
      type: InteractionResponseType.ChannelMessageWithSource as const,
      data: { content: message },
    };
  }

  async handleExperienceOperations(
    commandName: string,
    commandData: APIChatInputApplicationCommandInteractionData,
  ): Promise<DiscordCommandResponse> {
    const validation = await this.validateExperienceCommand(commandData);
    if ('error' in validation) {
      return validation.error;
    }

    const operationMap = {
      'dar-experiencia': 'add',
      'quitar-experiencia': 'remove',
      'establecer-experiencia': 'set',
    } as const;

    return this.userDiscordService.handleExperienceOperation(
      validation,
      operationMap[commandName as keyof typeof operationMap],
    );
  }

  async handleTopExperienceRanking(): Promise<DiscordCommandResponse> {
    try {
      const topUsers = await this.userDiscordService.findTopByExperience(10);
      if (!topUsers || topUsers.length === 0) {
        return {
          type: InteractionResponseType.ChannelMessageWithSource as const,
          data: { content: 'No hay usuarios con experiencia registrada.' },
        };
      }

      const response = ['✨ Top 10 usuarios con más experiencia:']
        .concat(
          topUsers.map((u, i) => {
            const medal =
              i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '✨';
            return `${medal} #${i + 1} ${u.username} - ${u.experience} XP`;
          }),
        )
        .join('\n');

      return {
        type: InteractionResponseType.ChannelMessageWithSource as const,
        data: { content: response },
      };
    } catch (error) {
      console.error('Error al obtener ranking de experiencia:', error);
      return {
        type: InteractionResponseType.ChannelMessageWithSource as const,
        data: { content: '❌ Error al obtener el ranking de experiencia.' },
      };
    }
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

  private async validateExperienceCommand(
    commandData: APIChatInputApplicationCommandInteractionData,
  ): Promise<InteractPoints | { error: DiscordCommandResponse }> {
    const userOption = commandData.options?.find(
      (opt) => opt.name === 'usuario',
    ) as APIApplicationCommandInteractionDataUserOption;

    const amountOption = commandData.options?.find(
      (opt) => opt.name === 'cantidad',
    ) as APIApplicationCommandInteractionDataNumberOption;

    if (!userOption || !amountOption) {
      return {
        error: {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content:
              '❌ Error: Faltan parámetros necesarios para la operación.',
          },
        },
      };
    }

    const userId = userOption.value;
    const points = amountOption.value;

    const resolvedUser = commandData.resolved?.users?.[userId] as APIUser;
    const resolvedMember = commandData.resolved?.members?.[
      userId
    ] as APIInteractionDataResolvedGuildMember;

    if (!resolvedUser || !resolvedMember) {
      return {
        error: {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: '❌ Error: No se pudo encontrar al usuario especificado.',
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
      console.error('Error al procesar usuario:', error);
      return {
        error: {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: '❌ Error al procesar el usuario: ' + error.message,
          },
        },
      };
    }
  }

  async handlePurchase(
    commandData: APIChatInputApplicationCommandInteractionData,
    interactionPayload: APIInteraction,
  ): Promise<DiscordCommandResponse> {
    const articleOption = commandData.options?.find(
      (opt) => opt.name === 'articulo',
    ) as APIApplicationCommandInteractionDataStringOption;

    const quantityOption = commandData.options?.find(
      (opt) => opt.name === 'cantidad',
    ) as APIApplicationCommandInteractionDataNumberOption;

    if (!articleOption?.value || !quantityOption?.value) {
      return this.errorResponse(
        '❌ Faltan parámetros necesarios para la compra.',
      );
    }

    const productId = parseInt(articleOption.value);
    const quantity = quantityOption.value;

    if (isNaN(productId)) {
      return this.errorResponse('❌ ID de producto inválido.');
    }

    try {
      const product = await this.productService.findOne(productId);
      if (!product) {
        return this.errorResponse('❌ Producto no encontrado.');
      }

      const userId = interactionPayload.member.user.id;
      const currentBalance = await this.kardexService.getUserLastBalance(
        userId,
      );
      const totalPrice = this.productService.calculatePrice(product) * quantity;

      if (currentBalance < totalPrice) {
        return {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: `❌ No tienes suficientes monedas. Necesitas ${totalPrice} monedas, pero solo tienes ${currentBalance}.`,
          },
        };
      }

      if (product.stock !== null && product.stock < quantity) {
        return this.errorResponse(
          `❌ No hay suficiente stock. Stock disponible: ${product.stock}`,
        );
      }

      await this.productService.update(productId, {
        stock: product.stock !== null ? product.stock - quantity : null,
      });

      await this.kardexService.removeCoins(
        userId,
        totalPrice,
        `Compra: ${quantity}x ${product.title}`,
      );

      const newBalance = await this.kardexService.getUserLastBalance(userId);

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: `✅ ¡Compra exitosa!\n\n🛍️ Artículo: ${product.title}\n📦 Cantidad: ${quantity}\n💰 Precio total: ${totalPrice} monedas\n💳 Saldo restante: ${newBalance} monedas`,
        },
      };
    } catch (error) {
      console.error('Error en la compra:', error);
      return this.errorResponse('❌ Error al procesar la compra.');
    }
  }

  async handleApplicationCommand(
    commandData: APIChatInputApplicationCommandInteractionData,
    interactionPayload: APIInteraction,
  ): Promise<DiscordCommandResponse> {
    try {
      switch (commandData.name) {
        case 'puntaje':
          return await this.handleUserScore(
            commandData,
            interactionPayload.member,
          );
        case 'saldo':
          return await this.handleUserBalance(
            commandData,
            interactionPayload.member,
          );
        case 'experiencia':
          return await this.handleUserExperience(
            commandData,
            interactionPayload.member,
          );
        case 'top-experiencia':
          return await this.userDiscordService.getTopExperienceRanking();
        case 'dar-experiencia':
        case 'quitar-experiencia':
        case 'establecer-experiencia':
          return await this.handleExperienceOperations(
            commandData.name,
            commandData,
          );
        case 'crear-nota':
          return await this.handleCreateNote(
            commandData.options || [],
            interactionPayload.member.user.id,
            interactionPayload.member.user.username,
          );
        case 'top-monedas':
          return await this.handleTopCoins();
        // Operaciones de puntos
        case 'añadir-puntos':
        case 'quitar-puntos':
        case 'establecer-puntos':
          return await this.handleUserPoints(commandData.name, commandData);
        // Operaciones de monedas
        case 'dar-monedas':
        case 'quitar-monedas':
        case 'establecer-monedas':
        case 'transferir-monedas':
          return await this.handleUserCoins(
            commandData.name,
            commandData,
            interactionPayload,
          );
        case 'comprar':
          return await this.handlePurchase(commandData, interactionPayload);
        default:
          return this.errorResponse(
            `Comando "${commandData.name}" no reconocido.`,
          );
      }
    } catch (error) {
      console.error('Error al procesar comando:', error);
      return this.errorResponse('Error al procesar el comando');
    }
  }
}
