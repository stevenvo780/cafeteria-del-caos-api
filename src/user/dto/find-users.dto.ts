import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class FindUsersDto {
  @ApiPropertyOptional({ description: 'Límite de resultados', default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Número de registros a saltar',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;

  @ApiPropertyOptional({ description: 'Buscar por nombre o email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filtrar por puntos mínimos' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minPoints?: number;

  @ApiPropertyOptional({ description: 'Filtrar por puntos máximos' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxPoints?: number;

  @ApiPropertyOptional({
    description: 'Ordenar por campo',
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Dirección del ordenamiento',
    enum: SortOrder,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;
}
