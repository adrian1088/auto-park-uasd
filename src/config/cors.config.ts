import { registerAs } from '@nestjs/config';
import { AppConfigType } from './app-config.type';


export type CorsConfigType = {
  origin: string;
  methods: string[];
  allowedHeaders: string[];
  credentials: boolean;
};

export default registerAs<CorsConfigType>('cors', () => {
  return {
    origin: process.env.CORS_ORIGIN || '*',
    methods: (process.env.CORS_METHODS || 'GET,HEAD,PUT,PATCH,POST,DELETE').split(','),
    allowedHeaders: (process.env.CORS_ALLOWED_HEADERS || 'Content-Type,Authorization').split(','),
    credentials: process.env.CORS_CREDENTIALS === 'true',
  };
});
