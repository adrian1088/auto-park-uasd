import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditService } from './audit.service';
import { Module } from '@nestjs/common';
import { AuditConfigService } from './audit-config.service';
import { AuditLog } from './entities/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [],
  providers: [AuditService, AuditConfigService],
  exports: [AuditService, AuditConfigService],
})
export class AuditLogsModule {}
