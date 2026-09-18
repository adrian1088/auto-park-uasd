import { PrimaryGeneratedColumn } from 'typeorm';

export class BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', comment: 'Primary key' })
  id: number;
}
