import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
} from 'class-validator';
import { KardexOperation } from '../entities/kardex.entity';

export class CreateKardexDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userDiscordId: string;

  @ApiProperty({ enum: KardexOperation })
  @IsEnum(KardexOperation)
  operation: KardexOperation;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  reference?: string;
}
