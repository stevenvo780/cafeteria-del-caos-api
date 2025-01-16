import { IsString, IsNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InfractionDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Nombre de la infracción',
    example: 'Infracción Ejemplo',
  })
  name: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Valor único de la infracción',
    example: 'EXAMPLE',
  })
  value: string;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    description: 'Puntos de penalización',
    example: 10,
  })
  points: number;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Emoji para representar la infracción',
    example: '🚫',
  })
  emoji: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Descripción de la infracción',
    example: 'Infracciones graves',
  })
  description: string;
}
