import { Module } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { DiscordController } from './discord.controller';
import { ConfigModule } from '../config/config.module';
import { LibraryModule } from '../library/library.module';
import { UserModule } from '../user/user.module';
import { UserDiscordModule } from '../user-discord/user-discord.module';
import { PublicationModule } from '../publication/publication.module';

@Module({
  imports: [
    ConfigModule,
    LibraryModule,
    UserModule,
    UserDiscordModule,
    PublicationModule, // Aseguramos que PublicationModule está importado
  ],
  controllers: [DiscordController],
  providers: [DiscordService],
  exports: [DiscordService],
})
export class DiscordModule {}
