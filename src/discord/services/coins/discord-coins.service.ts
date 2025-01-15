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
import {
  CommandResponse,
  DiscordInteractionResponse,
  InteractCoins,
  ValidateResult,
} from '../discord.types';
import { createErrorResponse, resolveTargetUser } from '../discord.util';
import {
  DISCORD_COMMANDS,
  CommandCategories,
  CoinsCommands,
} from '../discord-commands.config';

@Injectable()
export class DiscordCoinsService {
  private readonly commands =
    DISCORD_COMMANDS[CommandCategories.COINS].commands;

  constructor(
    private readonly kardexService: KardexService,
    private readonly userDiscordService: UserDiscordService,
    private readonly productService: ProductService,
  ) {}

  async handleCoinsCommand(
    commandName: string,
    commandData: APIChatInputApplicationCommandInteractionData,
    interactionPayload?: APIInteraction,
  ): Promise<DiscordInteractionResponse> {
    switch (commandName) {
      case CoinsCommands.GET_BALANCE:
        return await this.handleUserBalance(
          commandData,
          interactionPayload.member,
        );
      case CoinsCommands.TOP_COINS:
        return await this.handleTopCoins();
      case CoinsCommands.GIVE_COINS:
        return await this.handleUserCoins(
          'dar',
          commandData,
          interactionPayload,
        );
      case CoinsCommands.REMOVE_COINS:
        return await this.handleUserCoins(
          'quitar',
          commandData,
          interactionPayload,
        );
      case CoinsCommands.SET_COINS:
        return await this.handleUserCoins(
          'establecer',
          commandData,
          interactionPayload,
        );
      case CoinsCommands.TRANSFER_COINS:
        return await this.handleUserCoins(
          'transferir',
          commandData,
          interactionPayload,
        );
      case CoinsCommands.PURCHASE:
        return await this.handlePurchase(commandData, interactionPayload);
      default:
        return createErrorResponse('Comando de monedas no reconocido');
    }
  }

  private async handleUserCoins(
    action: string,
    commandData: APIChatInputApplicationCommandInteractionData,
    interactionPayload: APIInteraction,
  ): Promise<DiscordInteractionResponse> {
    const isTransfer = action === 'transferir';
    const validation = await this.validateCoinsCommand(
      commandData,
      interactionPayload,
      isTransfer,
    );

    if ('isError' in validation) {
      return validation;
    }

    const { user: sourceUser, target, coins } = validation;

    try {
      switch (action) {
        case 'dar': {
          const targetUser = target;
          if (!targetUser) {
            return createErrorResponse('❌ Usuario objetivo no encontrado.');
          }

          await this.kardexService.addCoins(
            targetUser.id,
            coins,
            'Discord command',
          );
          await this.userDiscordService.addExperience(targetUser.id, coins);
          const newBalance = await this.kardexService.getUserLastBalance(
            targetUser.id,
          );

          return {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: `💰 LLUVIA DE MONEDAS! <@${targetUser.id}> +${coins}\nSaldo actual: ${newBalance} monedas.\n✨ También ganaste ${coins} puntos de experiencia!`,
            },
          };
        }
        case 'quitar': {
          await this.kardexService.removeCoins(
            target.id,
            coins,
            'Discord command',
          );
          const newBalance = await this.kardexService.getUserLastBalance(
            target.id,
          );
          return {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: `🔥 GET REKT ${target.username} -${coins} monedas.\nSaldo actual: ${newBalance} monedas.`,
            },
          };
        }
        case 'establecer': {
          await this.kardexService.setCoins(
            target.id,
            coins,
            'Discord command',
          );
          const newBalance = await this.kardexService.getUserLastBalance(
            target.id,
          );
          return {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: `⚡ ESTABLECIDO! ${target.username} ahora tiene ${newBalance} monedas.`,
            },
          };
        }
        case 'transferir': {
          if (!target) {
            return createErrorResponse('❌ Falta el usuario de destino.');
          }
          await this.kardexService.transferCoins(
            sourceUser.id,
            target.id,
            coins,
          );

          const fromBalance = await this.kardexService.getUserLastBalance(
            sourceUser.id,
          );
          const toBalance = await this.kardexService.getUserLastBalance(
            target.id,
          );

          return {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: `✨ ¡TRANSFERENCIA EXITOSA!\n\n💸 ${sourceUser.username} ha enviado ${coins} monedas a ${target.username}\n\n💰 Nuevos balances:\n${sourceUser.username}: ${fromBalance} monedas\n${target.username}: ${toBalance} monedas`,
            },
          };
        }
        default: {
          return createErrorResponse('Comando de monedas no reconocido.');
        }
      }
    } catch (error) {
      console.error('Error en operación de monedas:', error);
      return createErrorResponse('💀 Error en la operación de monedas.');
    }
  }

  async handleUserBalance(
    commandData: APIChatInputApplicationCommandInteractionData,
    interactionMember: any,
  ): Promise<CommandResponse> {
    const userOption = commandData.options?.find(
      (opt) => opt.name === 'usuario',
    ) as any;

    const targetUser = await resolveTargetUser(
      this.userDiscordService,
      userOption,
      commandData,
      interactionMember,
    );

    if ('isError' in targetUser) {
      return createErrorResponse('❌ Error: No se encontró al usuario.');
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

  async handleTopCoins(): Promise<DiscordInteractionResponse> {
    try {
      const topCoins = await this.kardexService.findTopByCoins(10);
      if (!topCoins || topCoins.length === 0) {
        return createErrorResponse('No hay usuarios con monedas registradas.');
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
      return createErrorResponse('❌ Error al obtener el ranking de monedas.');
    }
  }

  async handlePurchase(
    commandData: APIChatInputApplicationCommandInteractionData,
    interactionPayload: APIInteraction,
  ): Promise<DiscordInteractionResponse> {
    const articleOption = commandData.options?.find(
      (opt) => opt.name === 'articulo',
    ) as APIApplicationCommandInteractionDataStringOption;

    const quantityOption = commandData.options?.find(
      (opt) => opt.name === 'cantidad',
    ) as APIApplicationCommandInteractionDataNumberOption;

    if (!articleOption?.value || !quantityOption?.value) {
      return createErrorResponse(
        '❌ Faltan parámetros necesarios para la compra.',
      );
    }

    const productId = parseInt(articleOption.value);
    const quantity = quantityOption.value;

    if (isNaN(productId)) {
      return createErrorResponse('❌ ID de producto inválido.');
    }

    try {
      const product = await this.productService.findOne(productId);
      if (!product) {
        return createErrorResponse('❌ Producto no encontrado.');
      }

      const userId = interactionPayload.member.user.id;
      const currentBalance = await this.kardexService.getUserLastBalance(
        userId,
      );
      const totalPrice = this.productService.calculatePrice(product) * quantity;

      if (currentBalance < totalPrice) {
        return createErrorResponse(
          `❌ No tienes suficientes monedas. Necesitas ${totalPrice} monedas, pero solo tienes ${currentBalance}.`,
        );
      }

      if (product.stock !== null && product.stock < quantity) {
        return createErrorResponse(
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
      return createErrorResponse('❌ Error al procesar la compra.');
    }
  }

  private async validateCoinsCommand(
    commandData: APIChatInputApplicationCommandInteractionData,
    interactionPayload: APIInteraction,
    isTransfer: boolean,
  ): Promise<ValidateResult<InteractCoins>> {
    const coinsOption = commandData.options?.find(
      (opt) => opt.name === 'cantidad',
    ) as APIApplicationCommandInteractionDataNumberOption;
    if (!coinsOption) {
      return createErrorResponse('Falta la cantidad de monedas.');
    }

    const sourceUser = await this.userDiscordService.findOrCreate({
      id: interactionPayload.member.user.id,
      username: interactionPayload.member.user.username,
      roles: interactionPayload.member.roles || [],
    });

    const target = await this.userDiscordService.resolveInteractionUser(
      commandData,
      'usuario',
    );
    if (!target) {
      return createErrorResponse('Usuario destino no encontrado.');
    }
    if (isTransfer && sourceUser.id === target.id) {
      return createErrorResponse('No puedes transferirte monedas a ti mismo.');
    }

    return {
      user: sourceUser,
      target,
      coins: coinsOption.value,
    };
  }
}
