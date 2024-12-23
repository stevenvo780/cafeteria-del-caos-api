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

@ApiTags('discord')
@Controller('discord')
export class DiscordController {
  constructor(private readonly discordService: DiscordService) {}

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

        console.log('Command name:', commandData.name);
        console.log('Options:', JSON.stringify(commandData.options, null, 2));
        console.log(
          'Resolved data:',
          JSON.stringify(commandData.resolved, null, 2),
        );

        if (!commandData?.name) {
          return {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: 'Error: Comando inválido o faltante.',
            },
          };
        }

        const options = commandData.options || [];

        console.log('Command data:', commandData);

        switch (commandData.name) {
          case 'crear-nota':
            return await this.discordService.handleCreateNote(options);
          case 'infraccion':
            return await this.discordService.handleInfraction(options);
          case 'añadir-puntos':
          case 'quitar-puntos':
          case 'establecer-puntos': {
            const validation = this.validatePointsCommand(commandData);

            if ('error' in validation) {
              return validation.error;
            }

            const { userOption, pointsOption } = validation;

            switch (commandData.name) {
              case 'añadir-puntos':
                return await this.discordService.handleAddPoints([
                  userOption,
                  pointsOption,
                ]);
              case 'quitar-puntos':
                return await this.discordService.handleRemovePoints([
                  userOption,
                  pointsOption,
                ]);
              case 'establecer-puntos':
                return await this.discordService.handleSetPoints([
                  userOption,
                  pointsOption,
                ]);
            }
          }
          default:
            return {
              type: InteractionResponseType.ChannelMessageWithSource,
              data: {
                content: `Comando "${commandData.name}" no reconocido.`,
              },
            };
        }
      }

      case InteractionType.ApplicationCommandAutocomplete:
        return {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: 'Autocompletado no implementado.',
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
            content: 'Tipo de interacción no soportado.',
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

    console.log('Discord webhook event:', eventPayload);

    return { message: 'Webhook received' };
  }

  private validatePointsCommand(
    commandData: APIChatInputApplicationCommandInteractionData,
  ) {
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
            content: 'Error: Faltan parámetros requeridos (usuario o puntos).',
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
            content:
              'Error: No se pudo resolver el usuario o miembro especificado.',
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

    return { userOption, pointsOption, resolvedUser, resolvedMember };
  }
}
