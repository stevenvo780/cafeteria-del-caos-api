import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '../config/config.module';
import { UserDiscordService } from './user-discord.service';
import { UserDiscordController } from './user-discord.controller';
import { UserDiscord } from './entities/user-discord.entity';
import { UserModule } from '../user/user.module';
import { KardexModule } from '../kardex/kardex.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserDiscord]),
    forwardRef(() => UserModule),
    forwardRef(() => KardexModule),
    forwardRef(() => ConfigModule),
  ],
  controllers: [UserDiscordController],
  providers: [UserDiscordService],
  exports: [UserDiscordService],
})
export class UserDiscordModule {}
