import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EncryptService } from './encrypt.service';
import encryptConfig from '../../config/encrypt.config';

@Module({
  imports: [ConfigModule.forFeature(encryptConfig)],
  providers: [EncryptService],
  exports: [EncryptService],
})
export class EncryptModule {}
