import { Entity, Column, OneToMany } from 'typeorm';
import { UserStatus } from '../enums/users-status.enum';
import { UserRole } from '../enums/users-role.enum';
import { UserSource } from '../enums/user-resource.enum';
import { AuditEntity } from '../../../shared/base/audit.entity';
import { VehicleEntity } from '../../vehicles/entities/vehicle.entity';
import { ReservationEntity } from '../../reservations/entities/reservation.entity';
import { TicketEntity } from '../../tickets/entities/ticket.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { AuditLog } from '../../audit-logs/entities/audit-log.entity';

@Entity({ name: 'users', comment: 'Users table storing user information' })
export class UserEntity extends AuditEntity {
  @Column({ type: 'varchar', length: 255, comment: 'User name' })
  name: string;

  @Column({ type: 'varchar', length: 255, comment: 'User email' })
  email: string;

  @Column({
    type: 'varchar',
    // select: false,
    length: 255,
    comment: 'User password',
  })
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
    comment: 'User role',
  })
  role!: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING_ACTIVATION,
    comment: 'User status',
  })
  status!: UserStatus;

  @Column({ type: 'varchar', length: 50, comment: 'Phone number' })
  phone: string;

  @Column({
    type: 'enum',
    enum: UserSource,
    default: UserSource.SELF_REGISTERED,
    comment: 'User source',
  })
  source: UserSource;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'Last login timestamptz',
  })
  lastLoginAt?: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'Account activation timestamp',
  })
  activatedAt?: Date;

  @OneToMany(() => ReservationEntity, (reservation) => reservation.user)
  reservations: ReservationEntity[];

  @OneToMany(() => TicketEntity, (ticket) => ticket.user)
  tickets: TicketEntity[];

  @OneToMany(() => Payment, (payment) => payment.user)
  payments: Payment[];

  @OneToMany(() => AuditLog, (auditLog) => auditLog.user)
  auditLogs: AuditLog[];
}
