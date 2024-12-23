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

export enum Repetition {
  NONE = 'none',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  FIFTEEN_DAYS = 'fifteen_days',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

@Entity()
export class Events extends SharedProp {
  @PrimaryGeneratedColumn()
  @ApiProperty({
    description: 'Unique identifier for the event',
    example: 1,
  })
  id: number;

  @Column()
  @ApiProperty({
    description: 'Title of the event',
    example: 'Cafeteria del Caos Meetup',
  })
  title: string;

  @Column('json')
  @ApiProperty({
    description: 'Event description in JSON format',
    type: 'object',
    example: { content: 'Detailed description of the event...' },
  })
  description: string;

  @Column()
  @ApiProperty({
    description: 'Start date of the event',
    type: 'string',
    format: 'date-time',
    example: '2024-08-21T15:30:00Z',
  })
  startDate: Date;

  @Column()
  @ApiProperty({
    description: 'End date of the event',
    type: 'string',
    format: 'date-time',
    example: '2024-08-21T18:30:00Z',
  })
  endDate: Date;

  @Column({ type: 'enum', enum: Repetition, default: Repetition.NONE })
  @ApiProperty({
    description: 'String describing the event repetition (if applicable)',
    enum: Repetition,
    required: false,
    example: 'weekly',
  })
  repetition: Repetition;

  @ManyToOne(() => User)
  @JoinColumn()
  @Index()
  @ApiProperty({
    description: 'Event author, represented by a user',
    type: () => User,
  })
  author: User;
}
