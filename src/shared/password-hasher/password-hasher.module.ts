import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PasswordHasherService } from './password-hasher.service';
import encryptConfig from '../../config/encrypt.config';

@Module({
  imports: [ConfigModule.forFeature(encryptConfig)],
  providers: [PasswordHasherService],
  exports: [PasswordHasherService],
})
export class PasswordHasherModule {}
