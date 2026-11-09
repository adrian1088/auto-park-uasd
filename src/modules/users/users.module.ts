import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UserEntity } from './entities/users.entity';
import { UsersService } from './users.service';
import { AuditLog } from '../audit-logs/entities/audit-log.entity';
import { PasswordHasherModule } from '../../shared/password-hasher/password-hasher.module';
import { TokensModule } from '../tokens/tokens.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, AuditLog]),
    PasswordHasherModule,
    TokensModule,
    MailModule,
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
