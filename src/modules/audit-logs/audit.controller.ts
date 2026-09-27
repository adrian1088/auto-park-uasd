import { ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiResponseType } from '../../shared/decorator/api-response-type.decorator';
import { AuditLogDto } from './dto/audit-log.dto';
import { FindAuditLogDto } from './dto/find-audit-log.dto';
import { AuditAdminGuard } from './guards/audit-admin.guard';

@ApiTags('Audit-logs')
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @UseGuards(AuditAdminGuard)
  @ApiResponseType(AuditLogDto, { type: 'paginated' })
  getAll(@Query() query: FindAuditLogDto) {
    return this.auditService.getAll(query);
  }
}
