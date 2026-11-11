import { Column, Entity, ManyToOne, OneToOne } from 'typeorm';
import { AuditEntity } from '../../../shared/base/audit.entity';
import { User } from '../../users/entities/users.entity';
import { ParkingSpace } from '../../parking/entities/parking-space.entity';
import { Vehicle } from '../../vehicles/entities/vehicle.entity';
import { Ticket } from '../../tickets/entities/ticket.entity';

@Entity({ name: 'reservations', comment: 'Reservations table' })
export class Reservation extends AuditEntity {
  @Column({ type: 'timestamp', comment: 'Start time of the reservation' })
  startTime: Date;

  @Column({ type: 'timestamp', comment: 'End time of the reservation' })
  endTime: Date;

  @Column({ type: 'varchar', unique: true, comment: 'Unique token encoded in the QR code for validation' })
  qrCode: string;

  @Column({ type: 'varchar', comment: 'Email address where the QR code and reservation info are sent' })
  guestEmail: string;

  @Column({ type: 'boolean', default: false, comment: 'Status of the QR email notification' })
  emailSent: boolean;

  // Relaciones
  @ManyToOne(() => User, (user) => user.reservations, { nullable: true })
  user: User | null;
  
  @ManyToOne(() => ParkingSpace, (parkingSpace) => parkingSpace.reservations, { nullable: true })
  parkingSpace: ParkingSpace | null;

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.reservations, { nullable: true })
  vehicle: Vehicle | null;

  @OneToOne(() => Ticket, (ticket) => ticket.reservation, { nullable: true })
  ticket: Ticket | null;
}