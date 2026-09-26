import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditService } from './audit.service';
import { Module } from '@nestjs/common';
import { AuditConfigService } from './audit-config.service';
import { AuditLog } from './entities/audit-log.entity';
import { AuditController } from './audit.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditController],
  providers: [AuditService, AuditConfigService],
  exports: [AuditService, AuditConfigService],
})
export class AuditLogsModule {}
