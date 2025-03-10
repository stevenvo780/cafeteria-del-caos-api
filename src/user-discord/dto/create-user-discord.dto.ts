import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DiscordRole } from '../entities/user-discord.entity';

export class CreateUserDiscordDto {
  @ApiProperty({ description: 'ID del usuario en Discord' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Nombre de usuario en Discord' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: 'Apodo en el servidor', required: false })
  @IsString()
  @IsOptional()
  nickname?: string;

  @ApiProperty({ description: 'Experiencia del usuario', example: 50 })
  @IsNumber()
  @IsOptional()
  experience?: number;

  @ApiProperty({ description: 'Puntos de penalización acumulados', example: 0 })
  @IsNumber()
  @IsOptional()
  points?: number;

  @ApiProperty({ description: 'Roles del usuario en Discord', type: [Object] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => Object)
  roles?: DiscordRole[];

  @ApiProperty({
    description: 'Datos adicionales del usuario',
    required: false,
  })
  @IsOptional()
  discordData?: any;
}
