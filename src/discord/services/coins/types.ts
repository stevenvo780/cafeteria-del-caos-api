import { ApplicationCommandOptionType } from 'discord.js';
import { USER_OPTION, QUANTITY_OPTION } from '../base-command-options';

export enum CoinsCommands {
  GET_BALANCE = 'ver-balance',
  TOP_COINS = 'top-monedas',
  GIVE_COINS = 'dar-monedas',
  REMOVE_COINS = 'quitar-monedas',
  SET_COINS = 'establecer-monedas',
  TRANSFER_COINS = 'transferir-monedas',
  PURCHASE = 'comprar',
}

const COINS_OPTION = {
  ...QUANTITY_OPTION,
  name: 'cantidad',
  description: 'Cantidad de monedas',
  min_value: 1,
} as const;

const ARTICLE_OPTION = {
  name: 'articulo',
  type: ApplicationCommandOptionType.String,
  description: 'Artículo a comprar',
  required: true,
} as const;

const CommonCoinsOptions = {
  VIEW: [USER_OPTION],
  MODIFY: [{ ...USER_OPTION, required: true }, COINS_OPTION],
  PURCHASE: [ARTICLE_OPTION, COINS_OPTION],
} as const;

const buildPurchaseOptions = async () => {
  try {
    const apiUrl = `${process.env.URL_BACKEND}/products`;
    const response = await fetch(apiUrl);
    const data: any = await response.json();

    if (!data.products || !Array.isArray(data.products)) {
      throw new Error('Invalid products data format');
    }

    return [
      {
        name: 'articulo',
        type: ApplicationCommandOptionType.String,
        description: 'Artículo a comprar',
        required: true,
        choices: data.products.map((product) => ({
          name: `${product.title} (${product.currentPrice} monedas)`,
          value: product.id.toString(),
        })),
      },
      {
        name: 'cantidad',
        type: ApplicationCommandOptionType.Integer,
        description: 'Cantidad a comprar',
        required: true,
        min_value: 1,
        max_value: 10,
      },
    ];
  } catch (error) {
    console.error('Error fetching purchase options:', error);
    return CommonCoinsOptions.PURCHASE;
  }
};

export const CoinsCommandData = {
  [CoinsCommands.GET_BALANCE]: {
    command: CoinsCommands.GET_BALANCE,
    description: 'Consulta tu balance de monedas del caos',
    options: CommonCoinsOptions.VIEW,
  },
  [CoinsCommands.TOP_COINS]: {
    command: CoinsCommands.TOP_COINS,
    description: 'Muestra el top 10 de usuarios con más monedas',
    options: [],
  },
  [CoinsCommands.GIVE_COINS]: {
    command: CoinsCommands.GIVE_COINS,
    description: 'Da monedas a un usuario',
    options: CommonCoinsOptions.MODIFY,
  },
  [CoinsCommands.REMOVE_COINS]: {
    command: CoinsCommands.REMOVE_COINS,
    description: 'Quita monedas a un usuario',
    options: CommonCoinsOptions.MODIFY,
  },
  [CoinsCommands.SET_COINS]: {
    command: CoinsCommands.SET_COINS,
    description: 'Establece una cantidad específica de monedas a un usuario',
    options: CommonCoinsOptions.MODIFY,
  },
  [CoinsCommands.TRANSFER_COINS]: {
    command: CoinsCommands.TRANSFER_COINS,
    description: 'Transfiere monedas a otro usuario',
    options: CommonCoinsOptions.MODIFY,
  },
  [CoinsCommands.PURCHASE]: {
    command: CoinsCommands.PURCHASE,
    description: 'Compra un artículo de la tienda',
    options: buildPurchaseOptions,
  },
} as const;
