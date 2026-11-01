import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivationTokenEntity } from '../tokens/entities/activation-token.entity';
import { IdentityService } from './identity.service';
import { IdentityController } from './identity.controller';
import { PasswordHasherModule } from '../../shared/password-hasher/password-hasher.module';
import { UserEntity } from '../users/entities/users.entity';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity,ActivationTokenEntity]),
    PasswordHasherModule,
    MailModule
  ],
  providers: [IdentityService],
  controllers: [IdentityController],
  exports: [IdentityService],
})
export class IdentityModule {}
