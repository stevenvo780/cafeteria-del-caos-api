import { Module } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { DiscordController } from './discord.controller';
import { ConfigModule } from '../config/config.module';
import { LibraryModule } from '../library/library.module';
import { UserModule } from '../user/user.module';
import { UserDiscordModule } from '../user-discord/user-discord.module';

@Module({
  imports: [ConfigModule, LibraryModule, UserModule, UserDiscordModule],
  controllers: [DiscordController],
  providers: [DiscordService],
  exports: [DiscordService],
})
export class DiscordModule {}
