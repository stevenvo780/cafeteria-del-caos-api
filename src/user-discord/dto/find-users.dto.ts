import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  IsArray,
  IsEnum,
  IsInt,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class FindUsersDto {
  @ApiPropertyOptional({ description: 'Límite de resultados', default: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => parseInt(value))
  limit?: number;

  @ApiPropertyOptional({
    description: 'Número de registros a saltar',
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => parseInt(value))
  offset?: number;

  @ApiPropertyOptional({ description: 'Buscar por username o nickname' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filtrar por puntos mínimos' })
  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value))
  minPoints?: number;

  @ApiPropertyOptional({ description: 'Filtrar por puntos máximos' })
  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value))
  maxPoints?: number;

  @ApiPropertyOptional({ description: 'Filtrar por roles específicos' })
  @IsOptional()
  @IsArray()
  roleIds?: string[];

  @ApiPropertyOptional({
    description: 'Ordenar por campo',
    enum: ['createdAt', 'updatedAt', 'username', 'points', 'coins'],
    default: 'createdAt',
  })
  @IsEnum(['points', 'coins'])
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Dirección del ordenamiento',
    enum: SortOrder,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;
}
