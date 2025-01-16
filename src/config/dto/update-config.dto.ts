import { PartialType } from '@nestjs/swagger';
import { CreateConfigDto } from './create-config.dto';
import { IsOptional, IsArray, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export interface Infraction {
  name: string;
  value: string;
  points: number;
  emoji: string;
  description: string;
}

export class UpdateConfigDto extends PartialType(CreateConfigDto) {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({
    description: 'IDs de canales de Discord a observar',
    type: [String],
  })
  watchedChannels?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({
    description: 'IDs de foros de Discord a observar',
    type: [String],
  })
  watchedForums?: string[];

  @IsOptional()
  @IsArray()
  infractions?: Infraction[];
}
