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

    console.log('Discord interaction:', interactionPayload);

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
            return await this.discordService.handleAddPoints(options);
          case 'quitar-puntos':
            return await this.discordService.handleRemovePoints(options);
          case 'establecer-puntos':
            return await this.discordService.handleSetPoints(options);
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
}
