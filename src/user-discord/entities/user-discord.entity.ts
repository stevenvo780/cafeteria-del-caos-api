import { Entity, Column, PrimaryColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { SharedProp } from '../../common/entities/sharedProp.helper';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  EDITOR = 'editor',
  USER = 'user',
}

export enum InfractionType {
  BLACK = 'BLACK',
  RED = 'RED',
  ORANGE = 'ORANGE',
  YELLOW = 'YELLOW',
}

export interface DiscordRole {
  id: string;
  name: string;
  color: number;
  position: number;
}

@Entity('user_discord')
export class UserDiscord extends SharedProp {
  @PrimaryColumn()
  @ApiProperty({
    description: 'ID único del usuario en Discord',
    example: '123456789012345678',
  })
  id: string;

  @Column({ nullable: true })
  @ApiProperty({
    description: 'Nombre de usuario en Discord',
    example: 'Usuario#1234',
  })
  username: string;

  @Column('jsonb', { default: [] })
  @ApiProperty({
    description: 'Roles del usuario en Discord',
    example: [
      {
        id: '123456789',
        name: 'Admin',
        color: 16711680,
        position: 1,
      },
    ],
    isArray: true,
    type: 'object',
  })
  roles: DiscordRole[];

  @Column({ default: 0 })
  @ApiProperty({
    description: 'Puntos de penalización acumulados',
    example: 0,
  })
  points: number;

  @Column({ default: 0 })
  @ApiProperty({
    description: 'Cantidad de monedas del usuario',
    example: 100,
  })
  coins: number;

  @Column('jsonb', { nullable: true })
  @ApiProperty({
    description: 'Datos adicionales del usuario de Discord',
  })
  discordData: any;
}
