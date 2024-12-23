import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FindUsersDto {
  @ApiPropertyOptional({ description: 'Número de usuarios a retornar' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Número de usuarios a saltar' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;

  @ApiPropertyOptional({ description: 'Búsqueda por nombre o email' })
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
}
