// kardex.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KardexService } from './kardex.service';
import { KardexController } from './kardex.controller';
import { Kardex } from './entities/kardex.entity';
import { UserDiscord } from '../user-discord/entities/user-discord.entity';
import { UserDiscordModule } from '../user-discord/user-discord.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Kardex, UserDiscord]),
    forwardRef(() => UserDiscordModule),
    forwardRef(() => UserModule), // Añade UserModule para inyectar UserService
  ],
  controllers: [KardexController],
  providers: [KardexService],
  exports: [KardexService],
})
export class KardexModule {}
