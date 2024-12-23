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

    if (eventPayload.type === InteractionType.ApplicationCommand) {
      switch (eventPayload.data.name) {
        case 'crear-nota':
          return this.discordService.handleCreateNote(
            eventPayload.data.options,
          );
        case 'infraccion':
          return this.discordService.handleInfraction(
            eventPayload.data.options,
          );
        default:
          return {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: 'Comando no reconocido',
            },
          };
      }
    }
  }
}
