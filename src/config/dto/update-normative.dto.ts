import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateNormativeDto {
  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Normativa general en formato HTML',
    required: false,
  })
  generalNormative?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Normativa del staff en formato HTML',
    required: false,
  })
  staffNormative?: string;
}
