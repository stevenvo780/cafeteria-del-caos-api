import { IsString, IsOptional, IsDate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LibraryVisibility } from '../entities/library.entity';

export class CreateLibraryDto {
  @IsString()
  @ApiProperty({
    description: 'The title of the library reference',
    type: String,
  })
  title: string;

  @IsString()
  @ApiProperty({
    description: 'The description of the library reference',
    type: String,
  })
  description: string;

  @IsOptional()
  @ApiProperty({
    description: 'The ID of the parent note',
    type: Number,
    required: false,
  })
  parentNoteId?: number;

  @ApiProperty({
    description: 'The date of the library reference',
    type: Date,
    default: new Date(),
  })
  referenceDate: Date = new Date();

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'URL de la imagen para la librería',
    type: String,
    required: false,
  })
  imageUrl?: string;

  @IsOptional()
  @ApiProperty({ enum: LibraryVisibility, required: false })
  visibility?: LibraryVisibility;
}
