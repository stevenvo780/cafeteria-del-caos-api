import {
  Module,
  NestModule,
  MiddlewareConsumer,
  OnModuleDestroy,
} from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventsModule } from './events/events.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import { LoggerMiddleware } from './logger.middleware';
import AppProvider from './app.provider';
import { LibraryModule } from './library/library.module';
import { PublicationModule } from './publication/publication.module';
import { TemplateModule } from './template/template.module';
import { LikeModule } from './like/like.module';
import { UserDiscordModule } from './user-discord/user-discord.module';
import { destroyDiscordClient } from './utils/discord-utils';
import { typeOrmConfig } from './config/typeorm.config';
import { KardexModule } from './kardex/kardex.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot(typeOrmConfig),
    AuthModule,
    EventsModule,
    UserModule,
    PublicationModule,
    LibraryModule,
    TemplateModule,
    LikeModule,
    //DiscordModule,
    UserDiscordModule,
    KardexModule,
  ],
  controllers: [AppController],
  providers: [AppService, AppProvider],
})
export class AppModule implements NestModule, OnModuleDestroy {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }

  async onModuleDestroy() {
    destroyDiscordClient();
  }
}
