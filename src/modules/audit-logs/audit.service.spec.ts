import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditService } from './audit.service';
import { FindAuditLogDto } from './dto/find-audit-log.dto';

describe('AuditService', () => {
  let service: AuditService;
  let repository: { findAndCount: jest.Mock };

  beforeEach(() => {
    repository = { findAndCount: jest.fn() };
    service = new AuditService(repository as unknown as Repository<AuditLog>);
  });

  it('maps paginated entities to DTOs without coercing string resource IDs', async () => {
    repository.findAndCount.mockResolvedValue([
      [
        {
          id: 1,
          userId: 9,
          action: 'PATCH /users/:id',
          payload: null,
          resource: 'users',
          resourceId: 'user-9',
          status: 'SUCCESS',
          errorMessage: null,
        } as AuditLog,
      ],
      1,
    ]);

    const result = await service.getAll({ page: 1, limit: 10 } as FindAuditLogDto);

    expect(result.data[0]).toEqual(
      expect.objectContaining({ userId: 9, resourceId: 'user-9' }),
    );
    expect(result.meta.total).toBe(1);
  });
});