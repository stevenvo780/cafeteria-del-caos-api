// kardex.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserDiscord } from '../../user-discord/entities/user-discord.entity';
import { ApiProperty } from '@nestjs/swagger';

export enum KardexOperation {
  IN = 'IN',
  OUT = 'OUT',
}

@Entity('kardex')
export class Kardex {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id: number;

  @ManyToOne(() => UserDiscord)
  @JoinColumn({ name: 'userDiscordId' })
  userDiscord: UserDiscord;

  @Column()
  @ApiProperty()
  userDiscordId: string;

  @Column({ type: 'enum', enum: KardexOperation })
  @ApiProperty({ enum: KardexOperation })
  operation: KardexOperation;

  @Column({ default: 0 })
  @ApiProperty()
  amount: number;

  @Column({ default: 0 })
  @ApiProperty({
    description: 'Balance result after this operation',
  })
  balance: number;

  @Column({ nullable: true })
  @ApiProperty({ description: 'Optional reference or reason' })
  reference?: string;

  @CreateDateColumn()
  @ApiProperty()
  createdAt: Date;
}
