import { registerAs } from '@nestjs/config';
import { AppConfig } from './app-config.type';

export default registerAs<AppConfig>('app', () => {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    name: process.env.APP_NAME || 'auto-park-uasd',
    description: process.env.APP_DESCRIPTION,
    port: Number(process.env.PORT) || 3000,
    apiPrefix: process.env.API_PREFIX || 'api/v1',
  };
});
