import { Column, Entity, ManyToOne, OneToOne } from 'typeorm';
import { AuditEntity } from '../../../shared/base/audit.entity';
import { UserEntity } from '../../users/entities/users.entity';
import { UserEntity } from '../../users/entities/users.entity';
import { ParkingSpace } from '../../parking/entities/parking-space.entity';
import { TicketEntity } from '../../tickets/entities/ticket.entity';

@Entity({ name: 'reservations', comment: 'Reservations table' })
export class ReservationEntity extends AuditEntity {
export class ReservationEntity extends AuditEntity {
  @Column({ type: 'timestamp', comment: 'Start time of the reservation' })
  startTime: Date;

  @Column({ type: 'timestamp', comment: 'End time of the reservation' })
  endTime: Date;

  @Column({ type: 'int', nullable: true, comment: 'User ID' })
  userId: number | null;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: 'Vehicle ID',
  })
  vehiclePlateNumber: string | null;

  @Column({ type: 'int', nullable: false, comment: 'Parking space ID' })
  parkingSpaceId: number;

  @Column({
    type: 'varchar',
    unique: true,
    comment: 'Unique token encoded in the QR code for validation',
  })
  qrCode: string;

  @Column({
    type: 'varchar',
    comment: 'Email address where the QR code and reservation info are sent',
  })
  guestEmail: string;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Status of the QR email notification',
  })
  emailSent: boolean;

  // Relaciones
  @ManyToOne(() => UserEntity, (user) => user.reservations, { nullable: true })
  user: UserEntity | null;

  @ManyToOne(() => ParkingSpace, (parkingSpace) => parkingSpace.reservations, {
    nullable: true,
  })
  parkingSpace: ParkingSpace | null;

  @OneToOne(() => TicketEntity, (ticket) => ticket.reservation, {
    nullable: true,
  })
  ticket: TicketEntity | null;
}