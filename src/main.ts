import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppConfig } from './config/app-config.type';
import { ResponseDto } from './shared/dtos/response.dto';
import { ResponsePaginatedDto } from './shared/dtos/response-paginated.dto';
import cookieParser from 'cookie-parser';
import { useContainer } from 'class-validator';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  /**
   * En una aplicación NestJS permite que la aplicación escuche eventos de apagado del sistema,
   * como SIGINT y SIGTERM, y ejecute cualquier lógica de limpieza necesaria antes de que la aplicación se cierre.
   * Esto es útil para cerrar conexiones de base de datos, liberar recursos, etc.
   * Ejemplo:
   * SIGINT es una señal de interrupción que se envía al proceso desde el teclado.
   * Al presionar Ctrl + C en la terminal, la aplicación se cerrará y se ejecutará la lógica de limpieza.
   */
  app.enableShutdownHooks(); // Enable listening for shutdown hooks
  useContainer(app.select(AppModule), { fallbackOnErrors: true });
  
  const config = app.get<ConfigService>(ConfigService);

  // cookie
  app.use(cookieParser());

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
  // if (appConfig.nodeEnv !== 'production') {
    const options = new DocumentBuilder()
      .setTitle(appConfig.name)
      .setDescription(appConfig.description)
      .setVersion('1.0')
      .addCookieAuth('Authentication')
      .build();

    const document = SwaggerModule.createDocument(app, options, {
      extraModels: [ResponseDto, ResponsePaginatedDto],
      deepScanRoutes: true,
    });

    SwaggerModule.setup(
      `${appConfig.apiPrefix}/${appConfig.swaggerPath}`,
      app,
      document,
      {
        jsonDocumentUrl: `${appConfig.apiPrefix}/${appConfig.swaggerPath}/json`,
        swaggerOptions: {
          // persistAuthorization: true,
          docExpansion: 'none',
          filter: true,
          showRequestHeaders: true,
          orderTags: true,
        },
      },
    );
  // }

  await app.listen(appConfig.port, async () => {
    const appUrl = await app.getUrl();
    console.log(`🚀 API running on ${appUrl}/${appConfig.apiPrefix}`);
    // if (appConfig.nodeEnv !== 'production') {
      console.log(
        `📚 Swagger docs: ${appUrl}/${appConfig.apiPrefix}/${appConfig.swaggerPath}`,
      );
      console.log(
        `🌐 API json documentation ${appUrl}/${appConfig.apiPrefix}/${appConfig.swaggerPath}/json`,
      );
    // }
  });
}
bootstrap();
