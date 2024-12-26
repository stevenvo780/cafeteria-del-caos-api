import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @IsString()
  @ApiProperty({
    description: 'Título del producto',
    example: 'Pack de Emojis Anime',
  })
  title: string;

  @IsString()
  @ApiProperty({ description: 'Descripción del producto' })
  description: string;

  @IsNumber()
  @ApiProperty({ description: 'Precio base del producto' })
  basePrice: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ description: 'Multiplicador de precio por escasez' })
  scarcityMultiplier?: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ description: 'Stock disponible' })
  stock?: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ description: 'Capacidad total de slots' })
  totalSlots?: number;
}
