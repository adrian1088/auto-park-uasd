import { Entity, Column, OneToMany } from 'typeorm';
import { UserStatus } from '../enums/users-status.enum';
import { UserRole } from '../enums/users-role.enum';
import { AuditEntity } from '../../../shared/base/audit.entity';
import { Vehicle } from '../../vehicles/entities/vehicle.entity';
import { Reservation } from '../../reservations/entities/reservation.entity';
import { Ticket } from '../../tickets/entities/ticket.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { AuditLog } from '../../audit-logs/entities/audit-log.entity';

@Entity({ name: 'users', comment: 'Users table storing user information' })
export class User extends AuditEntity {
  @Column({ type: 'varchar', length: 255, comment: 'User name' })
  name: string;

  @Column({ type: 'varchar', length: 255, comment: 'User email' })
  email: string;

  @Column({
    type: 'varchar',
    select: false,
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
    default: UserStatus.ACTIVE,
    comment: 'User status',
  })
  status!: UserStatus;

  @Column({ type: 'varchar', length: 255, comment: 'Phone number' })
  phone: string;

  @OneToMany(() => Vehicle, (vehicle) => vehicle.user)
  vehicles: Vehicle[];

  @OneToMany(() => Reservation, (reservation) => reservation.user)
  reservations: Reservation[];

  @OneToMany(() => Ticket, (ticket) => ticket.user)
  tickets: Ticket[];

  @OneToMany(() => Payment, (payment) => payment.user)
  payments: Payment[];

  @OneToMany(() => AuditLog, (auditLog) => auditLog.user)
  auditLogs: AuditLog[];
}
