import { IsString, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { InfractionDto } from './infraction.dto';

export class CreateConfigDto {
  @IsString()
  @ApiProperty({
    description: 'Normativas generales en formato HTML',
    type: String,
  })
  generalNormative: string;

  @IsString()
  @ApiProperty({
    description: 'Normativas del staff en formato HTML',
    type: String,
  })
  staffNormative: string;

  @IsString()
  @ApiProperty({
    description: 'Información del proyecto en formato HTML',
    type: String,
  })
  projectInfo: string;

  @IsString()
  @ApiProperty({
    description: 'Políticas de privacidad en formato HTML',
    type: String,
  })
  privacyPolicies: string;

  @ApiProperty({
    description: 'Lista de infracciones',
    type: [InfractionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InfractionDto)
  infractions?: InfractionDto[];
}
