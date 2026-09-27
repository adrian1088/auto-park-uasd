import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { FindAuditLogDto } from './dto/find-audit-log.dto';
import { ResponsePaginatedDto } from '../../shared/dtos/response-paginated.dto';
import { AuditLogDto } from './dto/audit-log.dto';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private repo: Repository<AuditLog>,
  ) {}

  async save(data: Partial<AuditLog>) {
    const createAuditEntry = this.repo.create(data);
    return this.repo.save(createAuditEntry);
  }

  async getAll({ page, limit }: FindAuditLogDto): Promise<ResponsePaginatedDto<AuditLogDto>> {
    const [auditLogs, total] = await this.repo.findAndCount({
      order: {
        id: 'DESC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });
    return ResponsePaginatedDto.fromDataAndMeta({
      data: auditLogs.map((auditLog) => AuditLogDto.fromEntity(auditLog)),
      total,
      page,
      limit,
    });
  }
}
