import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Min, IsInt, IsEnum } from 'class-validator';

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export enum SortBy {
  CREATED_AT = 'createdAt',
  AMOUNT = 'amount',
  BALANCE = 'balance',
  ID = 'id',
}

export class FilterKardexDto {
  @ApiPropertyOptional({ description: 'Límite de resultados', default: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Número de registros a saltar',
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => parseInt(value))
  offset?: number;

  @ApiPropertyOptional({ description: 'Buscar en general' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Buscar por fecha de inicio' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Buscar por fecha de fin' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Ordenar por campo' })
  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy;

  @ApiPropertyOptional({
    description: 'Ordenar de forma ascendente o descendente',
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;
}
