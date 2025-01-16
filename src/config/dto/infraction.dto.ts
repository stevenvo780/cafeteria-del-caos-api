import { IsString, IsNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InfractionDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Nombre de la infracción',
    example: 'Sanción grave',
  })
  name: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Valor identificador de la infracción',
    example: 'BLACK',
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
    description: 'Emoji que representa la infracción',
    example: '◼️',
  })
  emoji: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Descripción de la infracción',
    example: 'Infracciones muy graves',
  })
  description: string;
}
