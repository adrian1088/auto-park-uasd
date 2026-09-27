import { ApiResponseProperty } from '@nestjs/swagger';
import { AuditLog } from '../entities/audit-log.entity';

export class AuditLogDto {
  @ApiResponseProperty({ type: Number, example: 1 })
  id: number;

  @ApiResponseProperty({ type: Number, example: 123 })
  userId: number | null;

  @ApiResponseProperty({ type: String, example: 'CREATE' })
  action: string;

  @ApiResponseProperty({ type: Object, example: { key: 'value' } })
  payload: Record<string, unknown> | null;

  @ApiResponseProperty({ type: String, example: 'resource-name' })
  resource: string;

  @ApiResponseProperty({ type: String, example: '456' })
  resourceId: string | null;

  @ApiResponseProperty({ enum: ['SUCCESS', 'ERROR'], example: 'SUCCESS' })
  status: 'SUCCESS' | 'ERROR';

  @ApiResponseProperty({ type: String, example: 'Error message' })
  errorMessage?: string | null;

  static fromEntity(entity: AuditLog): AuditLogDto {
    const dto = new AuditLogDto();
    dto.id = entity.id;
    dto.userId = entity.userId ?? entity.user?.id ?? null;
    dto.action = entity.action;
    dto.payload = entity.payload;
    dto.resource = entity.resource;
    dto.resourceId = entity.resourceId ?? null;
    dto.status = entity.status;
    dto.errorMessage = entity.errorMessage;
    return dto;
  }
}