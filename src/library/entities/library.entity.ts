import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { SharedProp } from '../../common/entities/sharedProp.helper';
import { User } from '../../user/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

export enum LibraryVisibility {
  GENERAL = 'general',
  USERS = 'users',
  ADMIN = 'admin',
}

@Entity()
export class Library extends SharedProp {
  @PrimaryGeneratedColumn()
  @ApiProperty({
    description: 'Unique identifier for the library',
    example: 1,
  })
  id: number;

  @Column()
  @ApiProperty({
    description: 'Title of the library',
    example: 'Cafeteria del Caos Library',
  })
  title: string;

  @Column('text')
  @ApiProperty({
    description: 'Description of the library',
    example: 'A collection of literary resources and academic articles...',
  })
  description: string;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  @ApiProperty({
    description: 'Reference date associated with the library',
    type: 'string',
    format: 'date',
    example: '2024-08-21',
  })
  referenceDate: Date;

  @Column({
    type: 'enum',
    enum: LibraryVisibility,
    default: LibraryVisibility.GENERAL,
  })
  @ApiProperty({
    description: 'Library visibility',
    enum: LibraryVisibility,
    example: LibraryVisibility.GENERAL,
  })
  visibility: LibraryVisibility;

  @ManyToOne(() => User)
  @JoinColumn()
  @Index()
  @ApiProperty({
    description: 'Author of the library, represented by a user',
    type: () => User,
  })
  author: User;

  @ManyToOne(() => Library, (library) => library.children)
  @JoinColumn()
  @ApiProperty({
    description: 'Parent library of which this library is a child',
    type: () => Library,
    nullable: true,
  })
  parent: Library;

  @OneToMany(() => Library, (library) => library.parent)
  @ApiProperty({
    description: 'List of child libraries associated with this library',
    type: [Library],
  })
  children: Library[];

  @Column({ nullable: true })
  @ApiProperty({
    description: 'URL de la imagen asociada a la librería',
    example: 'https://storage.googleapis.com/my-bucket/image.jpg',
    required: false,
  })
  imageUrl?: string;
}
