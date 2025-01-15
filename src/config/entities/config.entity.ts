import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { SharedProp } from '../../common/entities/sharedProp.helper';
import { InfractionDto } from '../dto/infraction.dto';

@Entity()
export class Config extends SharedProp {
  @PrimaryGeneratedColumn()
  @ApiProperty({
    description: 'Identificador único de la configuración',
    example: 1,
  })
  id: number;

  @Column({ type: 'text', default: '' })
  @ApiProperty({
    description: 'Normativas generales en formato HTML',
    type: String,
    example: '<p>Normativas generales...</p>',
  })
  generalNormative: string;

  @Column({ type: 'text', default: '' })
  @ApiProperty({
    description: 'Normativas del staff en formato HTML',
    type: String,
    example: '<p>Normativas del staff...</p>',
  })
  staffNormative: string;

  @Column({ type: 'text', default: '' })
  @ApiProperty({
    description: 'Información del proyecto en formato HTML',
    type: String,
    example: '<p>Información del proyecto...</p>',
  })
  projectInfo: string;

  @Column({ type: 'text', default: '' })
  @ApiProperty({
    description: 'Políticas de privacidad en formato HTML',
    type: String,
    example: '<p>Políticas de privacidad...</p>',
  })
  privacyPolicies: string;

  @Column({ type: 'text', default: '' })
  @ApiProperty({
    description: 'Aviso de privacidad en formato HTML',
    type: String,
    example: '<p>Aviso de privacidad...</p>',
  })
  privacyNotice: string;

  @Column('simple-array', { default: '' })
  @ApiProperty({
    description: 'IDs de canales de Discord observados',
    type: [String],
    example: ['channel_id1', 'channel_id2'],
  })
  watchedChannels: string[];

  @Column('simple-array', { default: '' })
  @ApiProperty({
    description: 'IDs de foros de Discord observados',
    type: [String],
    example: ['forum_id1', 'forum_id2'],
  })
  watchedForums: string[];

  @Column('json', { default: [] })
  @ApiProperty({
    description: 'Tipos de sanción',
    type: () => [InfractionDto],
  })
  infractions: InfractionDto[];
}
