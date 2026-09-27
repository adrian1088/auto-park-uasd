import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditService } from './audit.service';
import { Module } from '@nestjs/common';
import { AuditConfigService } from './audit-config.service';
import { AuditLog } from './entities/audit-log.entity';
import { AuditController } from './audit.controller';
import { AuditAdminGuard } from './guards/audit-admin.guard';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditController],
  providers: [AuditService, AuditConfigService, AuditAdminGuard],
  exports: [AuditService, AuditConfigService],
})
export class AuditLogsModule {}
