import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './entities/user.entity';
import { UserDiscordModule } from '../user-discord/user-discord.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    forwardRef(() => UserDiscordModule), // Usar forwardRef para la dependencia circular
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService, TypeOrmModule], // Exportar TypeOrmModule para que FirebaseAuthGuard pueda usar el repositorio
})
export class UserModule {}
