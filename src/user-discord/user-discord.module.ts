// user-discord.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserDiscordService } from './user-discord.service';
import { UserDiscordController } from './user-discord.controller';
import { UserDiscord } from './entities/user-discord.entity';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserDiscord]),
    forwardRef(() => UserModule),
  ],
  controllers: [UserDiscordController],
  providers: [UserDiscordService],
  exports: [UserDiscordService],
})
export class UserDiscordModule {}
