import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

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
}
