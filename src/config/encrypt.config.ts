import { registerAs } from '@nestjs/config';

export interface IEncryptConfig {
  saltRounds: number;
}
export default registerAs<IEncryptConfig>('encrypt', () => ({
  saltRounds: process.env.CRYPTO_SALT_ROUNDS
    ? parseInt(process.env.CRYPTO_SALT_ROUNDS, 10)
    : 12,
}));
