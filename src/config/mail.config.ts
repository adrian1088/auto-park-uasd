import { registerAs } from '@nestjs/config';

export interface IMailConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  ignoreTls: boolean;
  secure: boolean;
  requireTls: boolean;
  defaultEmail: string;
  defaultName: string;
  clientPort: number;
}

export default registerAs<IMailConfig>('mail', () => ({
  host: process.env.MAIL_HOST || 'maildev',
  port: parseInt(process.env.MAIL_PORT, 10) || 1025,
  user: process.env.MAIL_USER || '',
  password: process.env.MAIL_PASSWORD || '',
  ignoreTls: process.env.MAIL_IGNORE_TLS === 'true',
  secure: process.env.MAIL_SECURE === 'true',
  requireTls: process.env.MAIL_REQUIRE_TLS === 'true',
  defaultEmail: process.env.MAIL_DEFAULT_EMAIL || 'noreply@example.com',
  defaultName: process.env.MAIL_DEFAULT_NAME || 'Auto Park',
  clientPort: parseInt(process.env.MAIL_CLIENT_PORT, 10) || 1080,
}));