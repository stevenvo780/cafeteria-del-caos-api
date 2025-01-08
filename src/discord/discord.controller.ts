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
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { InteractionType, InteractionResponseType } from 'discord.js';
import { DiscordService } from './discord.service';
import { DiscordVerificationService } from './services/discord-verification.service';
import { UserDiscordService } from '../user-discord/user-discord.service';
import { KardexService } from '../kardex/kardex.service';
import { DiscordInteractionResponse, ErrorResponse } from './discord.types';

@ApiTags('discord')
@Controller('discord')
export class DiscordController {
  constructor(
    private readonly discordService: DiscordService,
    private readonly verificationService: DiscordVerificationService,
    private readonly userDiscordService: UserDiscordService,
    private readonly kardexService: KardexService,
  ) {}

  @Get('guild/members')
  @ApiOperation({
    summary: 'Obtener el total de miembros de un servidor de Discord',
  })
  @ApiOkResponse({
    description: 'Número total de miembros en el servidor',
    type: Number,
  })
  async getGuildMemberCount(): Promise<number> {
    return this.discordService.getGuildMemberCount();
  }

  @Get('guild/online')
  @ApiOperation({
    summary: 'Obtener el número de miembros activos en un servidor de Discord',
  })
  @ApiOkResponse({
    description: 'Número de miembros activos (en línea) en el servidor',
    type: Number,
  })
  async getOnlineMemberCount(): Promise<number> {
    return this.discordService.getOnlineMemberCount();
  }

  @Post('interactions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Endpoint para manejar interacciones de Discord' })
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

          return await this.discordService.handleApplicationCommand(
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

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Endpoint para manejar webhooks de Discord' })
  async handleDiscordWebhook(
    @Body() eventPayload: any,
    @Headers('x-signature-ed25519') signature: string,
    @Headers('x-signature-timestamp') timestamp: string,
  ): Promise<any> {
    this.validateHeaders(signature, timestamp);
    this.verifyRequest(signature, timestamp, eventPayload);
    await this.discordService.handleWebhook(eventPayload);
    return { message: 'Webhook processed successfully' };
  }

  @Post('coins/report')
  async reportCoins(
    @Body()
    {
      user,
      amount,
    }: { user: { id: string; username: string }; amount: number },
    @Headers('x-bot-api-key') botKey: string,
  ) {
    if (botKey !== process.env.BOT_SYNC_KEY) {
      throw new UnauthorizedException('Llave inválida');
    }

    await this.userDiscordService.findOrCreate({
      id: user.id,
      username: user.username,
    });

    if (amount >= 0) {
      await this.kardexService.addCoins(user.id, amount, 'Report from Bot');
      await this.userDiscordService.addExperience(user.id, amount);
    } else {
      await this.kardexService.removeCoins(
        user.id,
        Math.abs(amount),
        'Report from Bot',
      );
    }

    const newBalance = await this.kardexService.getUserLastBalance(user.id);
    const discordUser = await this.userDiscordService.findOne(user.id);

    return {
      newBalance,
      experience: discordUser.experience,
    };
  }

  @Get('coins/:id')
  async getCoins(
    @Param('id') userId: string,
    @Headers('x-bot-api-key') botKey: string,
  ) {
    if (botKey !== process.env.BOT_SYNC_KEY) {
      throw new UnauthorizedException('Llave inválida');
    }

    const user = await this.userDiscordService.findOne(userId);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const balance = await this.kardexService.getUserLastBalance(userId);
    return { balance };
  }

  private validateHeaders(signature: string, timestamp: string) {
    if (!signature || !timestamp) {
      throw new UnauthorizedException('Cabeceras de autenticación faltantes');
    }
  }

  private verifyRequest(signature: string, timestamp: string, payload: any) {
    if (
      !this.verificationService.verifyDiscordRequest(
        signature,
        timestamp,
        payload,
      )
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
}
