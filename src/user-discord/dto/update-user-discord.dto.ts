import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateUserDiscordDto } from './create-user-discord.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateUserDiscordDto extends PartialType(CreateUserDiscordDto) {
  @ApiProperty({ description: 'Cantidad de monedas del usuario' })
  @IsString()
  @IsOptional()
  coins?: number;
}
