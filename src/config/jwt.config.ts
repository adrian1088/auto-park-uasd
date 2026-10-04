import { registerAs } from '@nestjs/config';

export interface IJwtConfig {
  secret: string;
  expiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
  cookieAuthName: string;
  cookieRefreshName: string;
}

export default registerAs<IJwtConfig>('jwt', () => ({
  secret: process.env.JWT_SECRET || 'mysecret',
  expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'myrefreshsecret',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  cookieAuthName: process.env.JWT_COOKIE_AUTH_NAME || 'Authentication',
  cookieRefreshName: process.env.JWT_REFRESH_COOKIE_NAME || 'Refresh',
}));
