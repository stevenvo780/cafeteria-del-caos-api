import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
    type: Array,
    items: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        value: { type: 'string' },
        points: { type: 'number' },
        description: { type: 'string' },
      },
    },
  })
  infractions?: {
    name: string;
    value: string;
    points: number;
    description: string;
  }[];
}
