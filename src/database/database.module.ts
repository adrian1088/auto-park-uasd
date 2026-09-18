import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseConfig } from '../config/database-config.type';
import { SnakeCaseNamingStrategy } from './snake-case-naming.strategy';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseConfig = configService.getOrThrow<DatabaseConfig>('database');

        return {
          type: databaseConfig.type,
          host: databaseConfig.host,
          port: databaseConfig.port,
          username: databaseConfig.username,
          password: databaseConfig.password,
          database: databaseConfig.database,
          autoLoadEntities: true,
          synchronize: databaseConfig.synchronize,
          namingStrategy: new SnakeCaseNamingStrategy(),
          extra: {
            max: databaseConfig.maxConnections,
          },
        };
      },
    }),
  ],
})
export class DatabaseModule {}