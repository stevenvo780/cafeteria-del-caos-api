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

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleDiscordWebhook(
    @Body() eventPayload: any,
    @Headers('x-signature-ed25519') signature: string,
    @Headers('x-signature-timestamp') timestamp: string,
  ): Promise<any> {
    console.log('Discord webhook:', eventPayload);
    try {
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
          eventPayload,
        )
      ) {
        throw new UnauthorizedException('Invalid request signature');
      }

      if (eventPayload.type === InteractionType.Ping) {
        return { type: InteractionResponseType.Pong };
      }

      if (eventPayload.type === InteractionType.MessageComponent) {
        return await this.discordService.handleMessage(eventPayload);
      }

      if (eventPayload.type === InteractionType.ApplicationCommand) {
        if (!eventPayload.data?.name) {
          return {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: 'Error: Comando inválido o faltante.',
            },
          };
        }

        switch (eventPayload.data.name) {
          case 'crear-nota':
            return await this.discordService.handleCreateNote(
              eventPayload.data.options || [],
            );
          case 'infraccion':
            return await this.discordService.handleInfraction(
              eventPayload.data.options || [],
            );
          case 'añadir-puntos':
            return await this.discordService.handleAddPoints(
              eventPayload.data.options || [],
            );
          case 'quitar-puntos':
            return await this.discordService.handleRemovePoints(
              eventPayload.data.options || [],
            );
          case 'establecer-puntos':
            return await this.discordService.handleSetPoints(
              eventPayload.data.options || [],
            );
          default:
            return {
              type: InteractionResponseType.ChannelMessageWithSource,
              data: {
                content: `Comando "${eventPayload.data.name}" no reconocido.`,
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
    } catch (error) {
      console.error('Error en webhook de Discord:', error);
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: 'Error interno del servidor. Por favor, intenta nuevamente.',
        },
      };
    }
  }
}
