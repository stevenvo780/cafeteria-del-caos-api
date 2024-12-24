import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import compression from 'compression';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import { registerDiscordCommands } from './utils/register-commands';

async function bootstrap() {
  dotenv.config();
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
    cors: true,
  });

  app.use(compression());

  const config = new DocumentBuilder()
    .setTitle('Cafeteria del Caos API')
    .setDescription('API documentation for Cafeteria del Caos')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app
    .getHttpAdapter()
    .getInstance()
    .get('/health', (req, res) => {
      res.status(200).send('OK');
    });

  const configService = app.get(ConfigService);
  const port = configService.get('PORT', 8080);
  await app.listen(port, '0.0.0.0', () => {
    console.log(`Application is running on port ${port}`);
    registerDiscordCommands()
      .then(() => console.log('Discord commands registered successfully'))
      .catch((error) =>
        console.error('Failed to register Discord commands:', error),
      );
  });
}
bootstrap();
