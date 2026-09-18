import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { UsersStatus } from '../enums/users-status.enum';
import { UsersRole } from '../enums/users-role.enum';
import { AuditEntity } from '../../../shared/base/audit.entity';

@Entity({ name: 'users', comment: 'Users table storing user information' })
export class User extends AuditEntity {
  @Column({ type: 'varchar', length: 255, comment: 'User name' }) name: string;

  @Column({ type: 'varchar', length: 255, comment: 'User email' })
  email: string;

  @Column({ type: 'varchar', length: 255, comment: 'User password' })
  password: string;

  @Column({
    type: 'enum',
    enum: UsersRole,
    default: UsersRole.USER,
    comment: 'User role',
  })
  role: string;

  @Column({
    type: 'enum',
    enum: UsersStatus,
    default: UsersStatus.ACTIVE,
    comment: 'User status',
  })
  status: string;

  @Column({ type: 'varchar', length: 255, comment: 'Phone number' })
  phone: string;
}
