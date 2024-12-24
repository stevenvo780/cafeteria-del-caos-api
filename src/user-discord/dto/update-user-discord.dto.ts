import { PartialType } from '@nestjs/swagger';
import { CreateUserDiscordDto } from './create-user-discord.dto';

export class UpdateUserDiscordDto extends PartialType(CreateUserDiscordDto) {}
