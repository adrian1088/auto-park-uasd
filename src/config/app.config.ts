import { registerAs } from '@nestjs/config';
import { AppConfigType } from './app-config.type';

export default registerAs<AppConfigType>('app', () => {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    name: process.env.APP_NAME || 'auto-park-uasd',
    description: process.env.APP_DESCRIPTION,
    port: Number(process.env.PORT) || 3000,
    apiPrefix: process.env.API_PREFIX || 'api/v1',
    swaggerPath: process.env.APP_SWAGGER_PATH || 'docs',
    frontendDomain: process.env.FRONTEND_DOMAIN || 'http://localhost:3000',
    backendDomain: process.env.BACKEND_DOMAIN || 'http://localhost:3001',
    workingDirectory: process.env.PWD || process.cwd(),
    defaultTokenActivationTtlHours:
      Number(process.env.DEFAULT_TOKEN_ACTIVATION_TTL_HOURS) || 24,
    defaultTokenResetTtlMinutes:
      Number(process.env.DEFAULT_TOKEN_RESET_TTL_MINUTES) || 60,
  };
});
