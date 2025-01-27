import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LibraryVisibility } from '../entities/library.entity';

export class CreateWithFolderDto {
  @IsString()
  @ApiProperty({
    description: 'Título de la nota',
    type: String,
  })
  title: string;

  @IsString()
  @ApiProperty({
    description: 'Descripción de la nota',
    type: String,
  })
  description: string;

  @IsString()
  @ApiProperty({
    description: 'Título de la carpeta donde se guardará la nota',
    type: String,
  })
  folderTitle: string;

  @IsOptional()
  @ApiProperty({
    enum: LibraryVisibility,
    required: false,
    default: LibraryVisibility.USERS,
  })
  visibility?: LibraryVisibility;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'URL de la imagen para la nota',
    type: String,
    required: false,
  })
  imageUrl?: string;
}
