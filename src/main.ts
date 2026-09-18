import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppConfig } from './config/app-config.type';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigService>(ConfigService);
  const appConfig = config.getOrThrow<AppConfig>('app');

  // swagger
  const options = new DocumentBuilder()
    .setTitle(appConfig.name)
    .setDescription(appConfig.description)
    .setVersion('1.0')
    // .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('docs', app, document);

  await app.listen(appConfig.port, () => {
    console.log(`Server is running on port ${appConfig.port}`);
  });
}
bootstrap();
