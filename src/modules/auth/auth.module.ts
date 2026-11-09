import { Module } from '@nestjs/common';
import { PasswordResetService } from './services/password-reset.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './services/auth.service';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';
import { PasswordHasherModule } from '../../shared/password-hasher/password-hasher.module';
import { UserEntity } from '../users/entities/users.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import ms from 'ms';
import { ActivationTokenEntity } from '../tokens/entities/activation-token.entity';
import { ActivationService } from './services/activation.service';
import { TokensModule } from '../tokens/tokens.module';
import { PasswordResetTokenEntity } from '../tokens/entities/password-reset-token.entity';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    PasswordHasherModule,
    UsersModule,
    MailModule,
    TokensModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const expiresIn = config.getOrThrow<ms.StringValue>('jwt.expiresIn');
        return {
          secret: config.getOrThrow('jwt.secret'),
          signOptions: {
            expiresIn: expiresIn,
          },
        };
      },
    }),
    TypeOrmModule.forFeature([
      UserEntity,
      ActivationTokenEntity,
      PasswordResetTokenEntity,
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    ActivationService,
    PasswordResetService,
    JwtStrategy,
    JwtRefreshStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
