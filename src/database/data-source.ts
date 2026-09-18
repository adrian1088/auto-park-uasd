import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from '../modules/users/entities/users.entity';
import { SnakeCaseNamingStrategy } from './snake-case-naming.strategy';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || '',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || '',
  entities: [User],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  namingStrategy: new SnakeCaseNamingStrategy(),
  migrationsTableName: 'migrations',
  synchronize: false,
  extra: {
    max: Number(process.env.DB_MAX_CONNECTIONS) || 10,
  },
});
