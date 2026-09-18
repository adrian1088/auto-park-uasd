import { CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { BaseEntity } from './base-entity';

export class AuditEntity extends BaseEntity {
  @CreateDateColumn({ type: 'timestamp', comment: 'Creation timestamp' })
  createdAt: Date;
  
  @UpdateDateColumn({ type: 'timestamp', comment: 'Last update timestamp' })
  updatedAt: Date;
}
