import { Injectable } from '@nestjs/common';
import {
  InteractionResponseType,
  APIChatInputApplicationCommandInteractionData,
  APIInteraction,
  APIApplicationCommandInteractionDataStringOption,
  APIApplicationCommandInteractionDataNumberOption,
} from 'discord.js';
import { KardexService } from '../../../kardex/kardex.service';
import { UserDiscordService } from '../../../user-discord/user-discord.service';
import { ProductService } from '../../../product/product.service';
import {
  DiscordInteractionResponse,
  InteractCoins,
  ValidateResult,
} from '../../discord.types';
import { createErrorResponse, resolveTargetUser } from '../../discord.util';
import { CoinsCommands, ARTICLE_OPTION, COINS_OPTION } from './types';

@Injectable()
export class DiscordCoinsService {
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
    try {
      switch (commandName) {
        case CoinsCommands.GET_BALANCE:
          return this.handleBalance(commandData, interactionPayload);
        case CoinsCommands.TOP_COINS:
          return this.handleTopCoins();
        case CoinsCommands.PURCHASE:
          return this.handlePurchase(commandData, interactionPayload);
        case CoinsCommands.GIVE_COINS:
          return this.handleGiveCoins(commandData, interactionPayload);
        case CoinsCommands.REMOVE_COINS:
          return this.handleRemoveCoins(commandData, interactionPayload);
        case CoinsCommands.SET_COINS:
          return this.handleSetCoins(commandData, interactionPayload);
        case CoinsCommands.TRANSFER_COINS:
          return this.handleTransferCoins(commandData, interactionPayload);
        default:
          return createErrorResponse('Comando de monedas no reconocido');
      }
    } catch (error) {
      console.error(`Error en comando ${commandName}:`, error);
      return createErrorResponse('❌ Error al procesar el comando');
    }
  }

  private async handleGiveCoins(
    commandData: APIChatInputApplicationCommandInteractionData,
    interactionPayload: APIInteraction,
  ): Promise<DiscordInteractionResponse> {
    const validation = await this.validateCoinsCommand(
      commandData,
      interactionPayload,
      false,
    );
    if ('isError' in validation) return validation;

    const { target, coins } = validation;

    try {
      await this.kardexService.addCoins(target.id, coins, 'Discord command');
      await this.userDiscordService.addExperience(target.id, coins);
      const balance = await this.kardexService.getUserLastBalance(target.id);

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: `💰 LLUVIA DE MONEDAS! <@${target.id}> +${coins}\nSaldo actual: ${balance} monedas.\n✨ También ganaste ${coins} puntos de experiencia!`,
        },
      };
    } catch (error) {
      console.error('Error al dar monedas:', error);
      return createErrorResponse('💀 Error al dar monedas.');
    }
  }

  private async handleRemoveCoins(
    commandData: APIChatInputApplicationCommandInteractionData,
    interactionPayload: APIInteraction,
  ): Promise<DiscordInteractionResponse> {
    const validation = await this.validateCoinsCommand(
      commandData,
      interactionPayload,
      false,
    );
    if ('isError' in validation) return validation;

    const { target, coins } = validation;

    try {
      await this.kardexService.removeCoins(target.id, coins, 'Discord command');
      const balance = await this.kardexService.getUserLastBalance(target.id);

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: `🔥 GET REKT ${target.username} -${coins} monedas.\nSaldo actual: ${balance} monedas.`,
        },
      };
    } catch (error) {
      console.error('Error al quitar monedas:', error);
      return createErrorResponse('💀 Error al quitar monedas.');
    }
  }

  private async handleSetCoins(
    commandData: APIChatInputApplicationCommandInteractionData,
    interactionPayload: APIInteraction,
  ): Promise<DiscordInteractionResponse> {
    const validation = await this.validateCoinsCommand(
      commandData,
      interactionPayload,
      false,
    );
    if ('isError' in validation) return validation;

    const { target, coins } = validation;

    try {
      await this.kardexService.setCoins(target.id, coins, 'Discord command');
      const balance = await this.kardexService.getUserLastBalance(target.id);

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: `⚡ ESTABLECIDO! ${target.username} ahora tiene ${balance} monedas.`,
        },
      };
    } catch (error) {
      console.error('Error al establecer monedas:', error);
      return createErrorResponse('💀 Error al establecer monedas.');
    }
  }

  private async handleTransferCoins(
    commandData: APIChatInputApplicationCommandInteractionData,
    interactionPayload: APIInteraction,
  ): Promise<DiscordInteractionResponse> {
    const validation = await this.validateCoinsCommand(
      commandData,
      interactionPayload,
      true,
    );
    if ('isError' in validation) return validation;

    const { user: sourceUser, target, coins } = validation;

    try {
      await this.kardexService.transferCoins(sourceUser.id, target.id, coins);
      const [sourceBalance, targetBalance] = await Promise.all([
        this.kardexService.getUserLastBalance(sourceUser.id),
        this.kardexService.getUserLastBalance(target.id),
      ]);

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: `✨ ¡TRANSFERENCIA EXITOSA!\n\n💸 ${sourceUser.username} ha enviado ${coins} monedas a ${target.username}\n\n💰 Nuevos balances:\n${sourceUser.username}: ${sourceBalance} monedas\n${target.username}: ${targetBalance} monedas`,
        },
      };
    } catch (error) {
      console.error('Error en transferencia de monedas:', error);
      return createErrorResponse('💀 Error en la transferencia de monedas.');
    }
  }

  private async handleTopCoins(): Promise<DiscordInteractionResponse> {
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

      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: ['🏆 Top 10 usuarios con más monedas:']
            .concat(leaderboardLines)
            .join('\n'),
        },
      };
    } catch (error) {
      console.error('Error al obtener ranking de monedas:', error);
      return createErrorResponse('❌ Error al obtener el ranking de monedas.');
    }
  }

  private async handlePurchase(
    commandData: APIChatInputApplicationCommandInteractionData,
    interactionPayload: APIInteraction,
  ): Promise<DiscordInteractionResponse> {
    const articleOption = commandData.options?.find(
      (opt) => opt.name === ARTICLE_OPTION.name,
    ) as APIApplicationCommandInteractionDataStringOption;
    const quantityOption = commandData.options?.find(
      (opt) => opt.name === COINS_OPTION.name,
    ) as APIApplicationCommandInteractionDataNumberOption;

    if (!articleOption?.value || !quantityOption?.value) {
      return createErrorResponse(
        '❌ Faltan parámetros necesarios para la compra.',
      );
    }

    const productId = parseInt(articleOption.value);
    if (isNaN(productId)) {
      return createErrorResponse('❌ ID de producto inválido.');
    }

    const quantity = quantityOption.value;

    try {
      const product = await this.productService.findOne(productId);
      if (!product) return createErrorResponse('❌ Producto no encontrado.');

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
        `Compra: ${quantity}x ${product.title} (${productId})`,
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

  private async handleBalance(
    commandData: APIChatInputApplicationCommandInteractionData,
    interactionPayload: APIInteraction,
  ): Promise<DiscordInteractionResponse> {
    const userOption = commandData.options?.find(
      (opt) => opt.name === 'usuario',
    );
    const targetUser = await resolveTargetUser(
      this.userDiscordService,
      userOption,
      commandData,
      interactionPayload.member,
    );

    if ('isError' in targetUser) {
      return createErrorResponse('❌ Usuario no encontrado');
    }

    const [lastBalance, topCoins] = await Promise.all([
      this.kardexService.getUserLastBalance(targetUser.id),
      this.kardexService.findTopByCoins(10),
    ]);

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

  private async validateCoinsCommand(
    commandData: APIChatInputApplicationCommandInteractionData,
    interactionPayload: APIInteraction,
    isTransfer: boolean,
  ): Promise<ValidateResult<InteractCoins>> {
    const coinsOption = commandData.options?.find(
      (opt) => opt.name === COINS_OPTION.name,
    ) as APIApplicationCommandInteractionDataNumberOption;

    const sourceUser = await this.userDiscordService.findOrCreate({
      id: interactionPayload.member.user.id,
      username: interactionPayload.member.user.username,
      roles: interactionPayload.member.roles || [],
    });

    const target = await this.userDiscordService.resolveInteractionUser(
      commandData,
    );
    if (!target) return createErrorResponse('Usuario destino no encontrado.');
    if (isTransfer && sourceUser.id === target.id) {
      return createErrorResponse('No puedes transferirte monedas a ti mismo.');
    }

    return { user: sourceUser, target, coins: coinsOption.value };
  }
}
