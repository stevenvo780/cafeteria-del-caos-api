import { IsString, IsDate, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LibraryVisibility } from '../entities/library.entity';

export class UpdateLibraryDto {
  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'The title of the library reference',
    type: String,
    required: false,
  })
  title?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'The description of the library reference',
    type: String,
    required: false,
  })
  description?: string;

  @IsDate()
  @IsOptional()
  @ApiProperty({
    description: 'The date of the library reference',
    type: Date,
    required: false,
  })
  referenceDate?: Date;

  @IsOptional()
  @ApiProperty({
    description: 'The ID of the parent note',
    type: Number,
    required: false,
  })
  parentNoteId?: number;

  @IsOptional()
  @IsEnum(LibraryVisibility)
  @ApiProperty({
    description: 'The visibility of the library reference',
    enum: LibraryVisibility,
    required: false,
  })
  visibility?: LibraryVisibility;
}
