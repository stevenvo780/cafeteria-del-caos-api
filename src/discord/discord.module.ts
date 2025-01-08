import { Module } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { DiscordController } from './discord.controller';
import { DiscordVerificationService } from './services/discord-verification.service';
import { DiscordNotesService } from './services/discord-notes.service';
import { DiscordPointsService } from './services/discord-points.service';
import { DiscordCoinsService } from './services/discord-coins.service';
import { DiscordExperienceService } from './services/discord-experience.service';
import { DiscordInfractionService } from './services/discord-infraction.service';
import { ConfigModule } from '../config/config.module';
import { LibraryModule } from '../library/library.module';
import { UserModule } from '../user/user.module';
import { UserDiscordModule } from '../user-discord/user-discord.module';
import { KardexModule } from '../kardex/kardex.module';
import { ProductModule } from '../product/product.module';

@Module({
  imports: [
    ConfigModule,
    LibraryModule,
    UserModule,
    UserDiscordModule,
    KardexModule,
    ProductModule,
  ],
  controllers: [DiscordController],
  providers: [
    DiscordService,
    DiscordVerificationService,
    DiscordNotesService,
    DiscordPointsService,
    DiscordCoinsService,
    DiscordExperienceService,
    DiscordInfractionService,
  ],
  exports: [DiscordService],
})
export class DiscordModule {}
