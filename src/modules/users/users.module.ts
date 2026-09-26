import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { User } from './entities/users.entity';
import { UsersService } from './users.service';
import { AuditLog } from '../audit-logs/entities/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, AuditLog])],
  providers: [UsersService],
  controllers: [UsersController]
})
export class UsersModule { }
