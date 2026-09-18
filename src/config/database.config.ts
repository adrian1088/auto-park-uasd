import { registerAs } from '@nestjs/config';
import { DatabaseConfig } from './database-config.type';

export default registerAs<DatabaseConfig>('database', () => ({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || '',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || '',
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  maxConnections: Number(process.env.DB_MAX_CONNECTIONS) || 10,
}));