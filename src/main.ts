import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppConfig } from './config/app-config.type';
import { ResponseDto } from './shared/dtos/response.dto';
import { ResponsePaginatedDto } from './shared/dtos/response-paginated.dto';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigService>(ConfigService);

  // global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // API prefix
  const appConfig = config.getOrThrow<AppConfig>('app');
  app.setGlobalPrefix(appConfig.apiPrefix);

  // swagger configuration
  if (appConfig.nodeEnv !== 'production') {
    const options = new DocumentBuilder()
      .setTitle(appConfig.name)
      .setDescription(appConfig.description)
      .setVersion('1.0')
      // .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, options, {
      extraModels: [ResponseDto, ResponsePaginatedDto],
      deepScanRoutes: true,
    });

    SwaggerModule.setup(`${appConfig.apiPrefix}/${appConfig.swaggerPath}`, app, document, {
      jsonDocumentUrl: `${appConfig.apiPrefix}/${appConfig.swaggerPath}/json`,
      swaggerOptions: {
        // persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        showRequestHeaders: true,
        orderTags: true,
      },
    });
  }

  await app.listen(appConfig.port, async () => {
    const appUrl = await app.getUrl();
    console.log(`🚀 API running on ${appUrl}/${appConfig.apiPrefix}`);
    console.log(
      `📚 Swagger docs: ${appUrl}/${appConfig.apiPrefix}/${appConfig.swaggerPath}`,
    );
    console.log(`🌐 API json documentation ${appUrl}/${appConfig.apiPrefix}/${appConfig.swaggerPath}/json`);
  });
}
bootstrap();
