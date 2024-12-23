import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class UpdatePointsDto {
  @ApiProperty({
    description: 'Nuevo valor de puntos de penalización',
    example: 5,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  points: number;
}
