import { Injectable } from '@nestjs/common';
import {
  InteractionResponseType,
  APIChatInputApplicationCommandInteractionData,
  APIInteraction,
  APIApplicationCommandInteractionDataStringOption,
  APIApplicationCommandInteractionDataNumberOption,
} from 'discord.js';
import { KardexService } from '../../kardex/kardex.service';
import { UserDiscordService } from '../../user-discord/user-discord.service';
import { ProductService } from '../../product/product.service';
import { ErrorResponse } from '../discord.types';

@Injectable()
export class DiscordCoinsService {
  constructor(
    private readonly kardexService: KardexService,
    private readonly userDiscordService: UserDiscordService,
    private readonly productService: ProductService,
  ) {}

  async handleUserCoins(
    commandName: string,
    commandData: APIChatInputApplicationCommandInteractionData,
    interactionPayload: APIInteraction,
  ) {
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
  ) {
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

  async handleTopCoins() {
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

  async handlePurchase(
    commandData: APIChatInputApplicationCommandInteractionData,
    interactionPayload: APIInteraction,
  ) {
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

  private async validateCoinsCommand(
    commandData: APIChatInputApplicationCommandInteractionData,
    interactionPayload: APIInteraction,
    isTransfer = false,
  ) {
    const userOption = commandData.options?.find(
      (opt) => opt.name === (isTransfer ? 'usuario' : 'usuario'),
    ) as any;

    const coinsOption = commandData.options?.find(
      (opt) => opt.name === (isTransfer ? 'cantidad' : 'cantidad'),
    ) as any;

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

    const resolvedUser = commandData.resolved?.users?.[userId];
    const resolvedMember = commandData.resolved?.members?.[userId];

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

    const result = {
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

  private errorResponse(message: string): ErrorResponse {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: { content: message },
      isError: true,
    };
  }
}
