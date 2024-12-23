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
import { InteractionType, InteractionResponseType } from 'discord.js';

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
    @Body() interactionPayload: any,
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

    if (interactionPayload.type === InteractionType.Ping) {
      return { type: InteractionResponseType.Pong };
    }

    if (interactionPayload.type === InteractionType.MessageComponent) {
      return await this.discordService.handleMessage(interactionPayload);
    }

    if (interactionPayload.type === InteractionType.ApplicationCommand) {
      if (!interactionPayload.data?.name) {
        return {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: 'Error: Comando inválido o faltante.',
          },
        };
      }

      switch (interactionPayload.data.name) {
        case 'crear-nota':
          return await this.discordService.handleCreateNote(
            interactionPayload.data.options || [],
          );
        case 'infraccion':
          return await this.discordService.handleInfraction(
            interactionPayload.data.options || [],
          );
        case 'añadir-puntos':
          return await this.discordService.handleAddPoints(
            interactionPayload.data.options || [],
          );
        case 'quitar-puntos':
          return await this.discordService.handleRemovePoints(
            interactionPayload.data.options || [],
          );
        case 'establecer-puntos':
          return await this.discordService.handleSetPoints(
            interactionPayload.data.options || [],
          );
        default:
          return {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: `Comando "${interactionPayload.data.name}" no reconocido.`,
            },
          };
      }
    }

    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: 'Tipo de interacción no soportado.',
      },
    };
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
