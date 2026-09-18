import {
  Column,
  Entity,
} from 'typeorm';
import { AuditEntity } from '../../../shared/base/audit.entity';

@Entity({ name: 'audit_logs', comment: 'Audit Log Entity' })
export class AuditLog extends AuditEntity {
  @Column({
    type: 'uuid',
    nullable: true,
    comment: 'User ID who performed the action',
  })
  userId: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    comment:
      'Description of the action performed e.g. POST /users, GET /products',
  })
  action: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment:
      'Resource on which the action was performed e.g. User, Product, Order',
  })
  resource: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'ID of the entity on which the action was performed',
  })
  resourceId: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Payload associated with the action',
  })
  payload: Record<string, unknown>;

  @Column({ length: 20, default: 'SUCCESS', comment: 'Status of the action' })
  status: 'SUCCESS' | 'ERROR';

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Error message if the action failed',
  })
  errorMessage: string;
}
