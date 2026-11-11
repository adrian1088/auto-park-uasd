import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PasswordResetTokenEntity } from './entities/password-reset-token.entity';
import { ActivationTokenEntity } from './entities/activation-token.entity';
import { TokensService } from './services/tokens.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ActivationTokenEntity, PasswordResetTokenEntity]),
  ],
  providers: [TokensService],
  exports: [TokensService],
})
export class TokensModule {}
