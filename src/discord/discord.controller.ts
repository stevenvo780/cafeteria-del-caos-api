import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Param,
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

      case InteractionType.ApplicationCommand: {
        const commandData =
          interactionPayload.data as APIChatInputApplicationCommandInteractionData;

        if (!commandData?.name) {
          return {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: { content: 'Error: Comando inválido o faltante.' },
          };
        }

        try {
          await this.userDiscordService.findOrCreate({
            id: interactionPayload.member.user.id,
            username: interactionPayload.member.user.username,
            roles: interactionPayload.member.roles || [],
          });
        } catch (error) {
          console.error('Error al procesar usuario:', error);
        }

        if (
          ['añadir-puntos', 'quitar-puntos', 'establecer-puntos'].includes(
            commandData.name,
          )
        ) {
          const validation = await this.validatePointsCommand(commandData);
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
          const validation = await this.validateCoinsCommand(
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
          case 'puntaje': {
            const userOption = commandData.options?.find(
              (opt) => opt.name === 'usuario',
            ) as APIApplicationCommandInteractionDataUserOption;

            let targetUser;
            if (userOption) {
              const resolvedUser = commandData.resolved?.users?.[
                userOption.value
              ] as APIUser;
              const resolvedMember = commandData.resolved?.members?.[
                userOption.value
              ] as APIInteractionDataResolvedGuildMember;

              if (!resolvedUser || !resolvedMember) {
                return {
                  type: InteractionResponseType.ChannelMessageWithSource,
                  data: {
                    content:
                      '❌ Error: No se encontró al usuario especificado.',
                  },
                };
              }

              targetUser = await this.userDiscordService.findOrCreate({
                id: userOption.value,
                username: resolvedUser.username,
                roles: resolvedMember.roles || [],
              });
            } else {
              // Si no se especificó usuario, usar el que ejecutó el comando
              targetUser = await this.userDiscordService.findOrCreate({
                id: interactionPayload.member.user.id,
                username: interactionPayload.member.user.username,
                roles: interactionPayload.member.roles || [],
              });
            }

            const message = userOption
              ? `🎯 ${targetUser.username} tiene ${targetUser.points} puntos de penalización en su historial del CAOS!`
              : `🎯 ¡${targetUser.username}! Cargas con ${targetUser.points} puntos de penalización en tu historial del CAOS!`;

            return {
              type: InteractionResponseType.ChannelMessageWithSource,
              data: {
                content: message,
              },
            };
          }

          case 'saldo':
            const user = await this.userDiscordService.findOrCreate({
              id: interactionPayload.member.user.id,
              username: interactionPayload.member.user.username,
              roles: interactionPayload.member.roles || [],
            });
            return {
              type: InteractionResponseType.ChannelMessageWithSource,
              data: {
                content: `💰 ¡${user.username}! Tu fortuna asciende a ${user.coins} monedas del caos!\n\n🏦 Balance actual del banco del CAOS`,
              },
            };
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

  @Post('coins/report')
  async reportCoins(
    @Body() { userId, amount }: { userId: string; amount: number },
    @Headers('x-bot-api-key') botKey: string,
  ) {
    if (botKey !== process.env.BOT_SYNC_KEY) {
      throw new UnauthorizedException('Llave inválida');
    }
    const user = await this.userDiscordService.findOrCreate({
      id: userId,
      username: 'Bot',
    });
    user.coins += amount;
    await this.userDiscordService.updateCoins(userId, user.coins);
    return { newBalance: user.coins };
  }

  @Get('coins/:id')
  async getCoins(
    @Param('id') userId: string,
    @Headers('x-bot-api-key') botKey: string,
  ) {
    if (botKey !== process.env.BOT_SYNC_KEY) {
      throw new UnauthorizedException('Llave inválida');
    }
    const user = await this.userDiscordService.findOrCreate({
      id: userId,
      username: 'Unknown',
    });
    return { balance: user.coins };
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
