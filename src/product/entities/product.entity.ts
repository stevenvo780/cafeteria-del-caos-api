import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';
import { SharedProp } from '../../common/entities/sharedProp.helper';

@Entity()
export class Product extends SharedProp {
  @PrimaryGeneratedColumn()
  @ApiProperty({
    description: 'Identificador único del producto',
    example: 1,
  })
  id: number;

  @Column()
  @ApiProperty({
    description: 'Título del producto',
    example: 'Pack de Emojis Anime',
  })
  title: string;

  @Column('text')
  @ApiProperty({
    description: 'Descripción del producto',
    example: 'Colección de emojis anime para tu servidor',
  })
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  @ApiProperty({
    description: 'Precio base del producto',
    example: 20.0,
  })
  basePrice: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  @ApiProperty({
    description: 'Multiplicador de precio por escasez',
    example: 1.5,
  })
  scarcityMultiplier: number;

  @Column('int', { nullable: true })
  @ApiProperty({
    description: 'Stock disponible (null significa infinito)',
    example: 150,
  })
  stock: number | null;

  @Column('int', { nullable: true })
  @ApiProperty({
    description: 'Capacidad total de slots',
    example: 150,
  })
  totalSlots: number | null;

  @ManyToOne(() => User)
  @JoinColumn()
  @Index()
  @ApiProperty({
    description: 'Creador del producto',
    type: () => User,
  })
  creator: User;
}
