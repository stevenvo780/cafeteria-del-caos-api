import { Module } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { DiscordController } from './discord.controller';
import { EventsModule } from 'src/events/events.module';
import { LibraryModule } from 'src/library/library.module';
import { UserModule } from '../user/user.module';
import { UserDiscordModule } from '../user-discord/user-discord.module'; // Añadir esta importación

@Module({
  imports: [EventsModule, LibraryModule, UserModule, UserDiscordModule], // Importar el módulo
  controllers: [DiscordController],
  providers: [DiscordService],
  exports: [DiscordService],
})
export class DiscordModule {}
