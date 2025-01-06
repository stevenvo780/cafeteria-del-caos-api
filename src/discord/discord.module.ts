import { Module } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { DiscordController } from './discord.controller';
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
  providers: [DiscordService],
  exports: [DiscordService],
})
export class DiscordModule {}
