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
import { InteractionType, InteractionResponseType } from 'discord.js';
import { DiscordInteractionResponse, ErrorResponse } from './discord.types';

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
    @Body() interactionPayload: any,
    @Headers('x-signature-ed25519') signature: string,
    @Headers('x-signature-timestamp') timestamp: string,
  ): Promise<DiscordInteractionResponse> {
    this.validateHeaders(signature, timestamp);
    this.verifyRequest(signature, timestamp, interactionPayload);

    const { type, data: commandData } = interactionPayload;

    switch (type) {
      case InteractionType.Ping:
        return { type: InteractionResponseType.Pong };

      case InteractionType.ApplicationCommand: {
        try {
          if (!commandData?.name) {
            return this.errorResponse('Comando inválido o faltante.');
          }

          await this.userDiscordService.findOrCreate({
            id: interactionPayload.member.user.id,
            username: interactionPayload.member.user.username,
            roles: interactionPayload.member.roles || [],
          });

          return await this.handleApplicationCommand(
            commandData,
            interactionPayload,
          );
        } catch (error) {
          console.error('Error al procesar comando:', error);
          return this.errorResponse('Error al procesar el comando');
        }
      }

      default:
        return this.errorResponse('Tipo de interacción no soportada');
    }
  }

  private async handleApplicationCommand(
    commandData: any,
    interactionPayload: any,
  ) {
    try {
      // Separar los comandos por categorías para mejor organización
      const experienceCommands = [
        'dar-experiencia',
        'quitar-experiencia',
        'establecer-experiencia',
      ];
      const pointCommands = [
        'añadir-puntos',
        'quitar-puntos',
        'establecer-puntos',
      ];
      const coinCommands = [
        'dar-monedas',
        'quitar-monedas',
        'establecer-monedas',
        'transferir-monedas',
      ];

      // Manejar comandos de experiencia
      if (experienceCommands.includes(commandData.name)) {
        return await this.discordService.handleExperienceOperations(
          commandData.name,
          commandData,
        );
      }

      // Manejar comandos de puntos
      if (pointCommands.includes(commandData.name)) {
        return await this.discordService.handleUserPoints(
          commandData.name,
          commandData,
        );
      }

      // Manejar comandos de monedas
      if (coinCommands.includes(commandData.name)) {
        return await this.discordService.handleUserCoins(
          commandData.name,
          commandData,
          interactionPayload,
        );
      }

      // Manejar otros comandos
      switch (commandData.name) {
        case 'experiencia':
          return await this.discordService.handleUserExperience(
            commandData,
            interactionPayload.member,
          );
        case 'top-experiencia':
          return await this.discordService.handleTopExperienceRanking();
        case 'puntaje':
          return await this.discordService.handleUserScore(
            commandData,
            interactionPayload.member,
          );
        case 'saldo':
          return await this.discordService.handleUserBalance(
            commandData,
            interactionPayload.member,
          );
        case 'crear-nota':
          return await this.discordService.handleCreateNote(
            commandData.options || [],
          );
        case 'top-monedas':
          return await this.discordService.handleTopCoins();
        default:
          return this.errorResponse(
            `Comando "${commandData.name}" no reconocido.`,
          );
      }
    } catch (error) {
      console.error('Error al procesar comando:', error);
      return this.errorResponse('Error al procesar el comando');
    }
  }

  private validateHeaders(signature: string, timestamp: string) {
    if (!signature || !timestamp) {
      throw new UnauthorizedException('Cabeceras de autenticación faltantes');
    }
  }

  private verifyRequest(signature: string, timestamp: string, payload: any) {
    if (
      !this.discordService.verifyDiscordRequest(signature, timestamp, payload)
    ) {
      throw new UnauthorizedException('Firma de solicitud inválida');
    }
  }

  private errorResponse(message: string): ErrorResponse {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: { content: message },
      isError: true,
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
}
