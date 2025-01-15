import { ApplicationCommandOptionType } from 'discord.js';
import { BaseCommandOptions } from '../../discord-commands.config';

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
  ...BaseCommandOptions.QUANTITY,
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
  VIEW: [BaseCommandOptions.USER],
  MODIFY: [{ ...BaseCommandOptions.USER, required: true }, COINS_OPTION],
  PURCHASE: [ARTICLE_OPTION, COINS_OPTION],
} as const;

export const CoinsCommandOptions = {
  [CoinsCommands.GET_BALANCE]: CommonCoinsOptions.VIEW,
  [CoinsCommands.TOP_COINS]: [],
  [CoinsCommands.GIVE_COINS]: CommonCoinsOptions.MODIFY,
  [CoinsCommands.REMOVE_COINS]: CommonCoinsOptions.MODIFY,
  [CoinsCommands.SET_COINS]: CommonCoinsOptions.MODIFY,
  [CoinsCommands.TRANSFER_COINS]: CommonCoinsOptions.MODIFY,
  [CoinsCommands.PURCHASE]: CommonCoinsOptions.PURCHASE,
} as const;

// Función auxiliar para construir el comando de compra
const buildPurchaseOptions = (productOptions: any[]) => [
  {
    name: 'articulo',
    type: ApplicationCommandOptionType.String,
    description: 'Artículo a comprar',
    required: true,
    choices: productOptions,
  },
  {
    name: 'cantidad',
    type: ApplicationCommandOptionType.Integer,
    description: 'Cantidad a comprar',
    required: true,
    min_value: 1,
  },
];

// Descripciones de los comandos de monedas
export const CoinsCommandData = {
  commands: Object.values(CoinsCommands).filter(
    (cmd) => cmd !== CoinsCommands.PURCHASE,
  ) as string[],
  descriptions: {
    [CoinsCommands.GET_BALANCE]: 'Consulta tu balance de monedas del caos',
    [CoinsCommands.TOP_COINS]: 'Muestra el top 10 de usuarios con más monedas',
    [CoinsCommands.GIVE_COINS]: 'Da monedas a un usuario',
    [CoinsCommands.REMOVE_COINS]: 'Quita monedas a un usuario',
    [CoinsCommands.SET_COINS]:
      'Establece una cantidad específica de monedas a un usuario',
    [CoinsCommands.TRANSFER_COINS]: 'Transfiere monedas a otro usuario',
    [CoinsCommands.PURCHASE]: 'Compra un artículo de la tienda',
  },
  options: {
    ...CoinsCommandOptions,
  },
} as const;
