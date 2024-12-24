import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { DiscordService } from './discord.service';
import { UserDiscordService } from '../user-discord/user-discord.service';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import {
  APIInteraction,
  InteractionType,
  InteractionResponseType,
  APIChatInputApplicationCommandInteractionData,
  APIApplicationCommandInteractionDataUserOption,
  APIApplicationCommandInteractionDataNumberOption,
  APIInteractionDataResolvedGuildMember,
  APIUser,
} from 'discord.js';
import { InteractPoints, InteractCoins } from './discord.types';

@ApiTags('discord')
@Controller('discord')
export class DiscordController {
  constructor(
    private readonly discordService: DiscordService,
    private readonly userDiscordService: UserDiscordService,
  ) {}

  @ApiOperation({
    summary: 'Obtener el total de miembros de un servidor de Discord',
  })
  @ApiOkResponse({
    description: 'Número total de miembros en el servidor',
    type: Number,
  })
  @Get('guild/members')
  async getGuildMemberCount(): Promise<number> {
    return this.discordService.getGuildMemberCount();
  }

  @ApiOperation({
    summary: 'Obtener el número de miembros activos en un servidor de Discord',
  })
  @ApiOkResponse({
    description: 'Número de miembros activos (en línea) en el servidor',
    type: Number,
  })
  @Get('guild/online')
  async getOnlineMemberCount(): Promise<number> {
    return this.discordService.getOnlineMemberCount();
  }

  @Post('interactions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Endpoint para manejar interacciones de Discord (comandos, botones, etc)',
  })
  async handleDiscordInteractions(
    @Body() interactionPayload: APIInteraction,
    @Headers('x-signature-ed25519') signature: string,
    @Headers('x-signature-timestamp') timestamp: string,
  ): Promise<any> {
    if (!signature || !timestamp) {
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: 'Error: Cabeceras de autenticación faltantes.',
        },
      };
    }

    if (
      !this.discordService.verifyDiscordRequest(
        signature,
        timestamp,
        interactionPayload,
      )
    ) {
      throw new UnauthorizedException('Invalid request signature');
    }

    console.log(
      'Discord interaction type:',
      InteractionType[interactionPayload.type],
    );

    switch (interactionPayload.type) {
      case InteractionType.Ping:
        return { type: InteractionResponseType.Pong };

      case InteractionType.MessageComponent:
        return await this.discordService.handleMessage(interactionPayload);

      case InteractionType.ApplicationCommand: {
        const commandData =
          interactionPayload.data as APIChatInputApplicationCommandInteractionData;

        if (!commandData?.name) {
          return {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: { content: 'Error: Comando inválido o faltante.' },
          };
        }

        if (
          ['añadir-puntos', 'quitar-puntos', 'establecer-puntos'].includes(
            commandData.name,
          )
        ) {
          const validation = this.validatePointsCommand(commandData);
          if ('error' in validation) {
            return validation.error;
          }

          switch (commandData.name) {
            case 'añadir-puntos':
              return await this.userDiscordService.handleAddPoints(validation);
            case 'quitar-puntos':
              return await this.userDiscordService.handleRemovePoints(
                validation,
              );
            case 'establecer-puntos':
              return await this.userDiscordService.handleSetPoints(validation);
          }
        }

        if (
          [
            'dar-monedas',
            'quitar-monedas',
            'establecer-monedas',
            'transferir-monedas',
          ].includes(commandData.name)
        ) {
          const validation = this.validateCoinsCommand(
            commandData,
            interactionPayload,
            commandData.name === 'transferir-monedas',
          );

          if ('error' in validation) {
            return validation.error;
          }

          switch (commandData.name) {
            case 'dar-monedas':
              return await this.userDiscordService.handleCoinsOperation(
                validation,
                'add',
              );
            case 'quitar-monedas':
              return await this.userDiscordService.handleCoinsOperation(
                validation,
                'remove',
              );
            case 'establecer-monedas':
              return await this.userDiscordService.handleCoinsOperation(
                validation,
                'set',
              );
            case 'transferir-monedas':
              return await this.userDiscordService.handleCoinsOperation(
                validation,
                'transfer',
              );
          }
        }

        switch (commandData.name) {
          case 'crear-nota':
            return await this.discordService.handleCreateNote(
              commandData.options || [],
            );
          default:
            return {
              type: InteractionResponseType.ChannelMessageWithSource,
              data: { content: `Comando "${commandData.name}" no reconocido.` },
            };
        }
      }

      case InteractionType.ApplicationCommandAutocomplete:
        return {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: '¡El autocompletado es para débiles!',
          },
        };

      case InteractionType.ModalSubmit:
        return {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: 'Modales no implementados.',
          },
        };

      default:
        return {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content:
              '¡¿QUÉ DEMONIOS INTENTAS HACER?! Esa interacción no existe en este reino de caos',
          },
        };
    }
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Endpoint para manejar webhooks de Discord (eventos del servidor)',
  })
  async handleDiscordWebhook(
    @Body() eventPayload: any,
    @Headers('x-signature-ed25519') signature: string,
    @Headers('x-signature-timestamp') timestamp: string,
  ): Promise<any> {
    if (!signature || !timestamp) {
      throw new UnauthorizedException('Missing authentication headers');
    }

    if (
      !this.discordService.verifyDiscordRequest(
        signature,
        timestamp,
        eventPayload,
      )
    ) {
      throw new UnauthorizedException('Invalid request signature');
    }

    await this.discordService.handleWebhook(eventPayload);
    return { message: 'Webhook processed successfully' };
  }

  private validatePointsCommand(
    commandData: APIChatInputApplicationCommandInteractionData,
  ): InteractPoints | { error: any } {
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

    console.log('Processing points command:', {
      userId,
      points,
      username: resolvedUser.username,
      roles: resolvedMember.roles || [],
    });

    return {
      userId,
      points,
      username: resolvedUser.username,
      roles: resolvedMember.roles || [],
    };
  }

  private validateCoinsCommand(
    commandData: APIChatInputApplicationCommandInteractionData,
    interactionPayload: APIInteraction,
    isTransfer = false,
  ): InteractCoins | { error: any } {
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

    return result;
  }
}
