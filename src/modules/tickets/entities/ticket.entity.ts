import { Column, OneToOne, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { TicketStatus } from '../enum/ticket-status.enum';
import { AuditEntity } from '../../../shared/base/audit.entity';
import { Vehicle } from '../../vehicles/entities/vehicle.entity';
import { User } from '../../users/entities/users.entity';
import { ParkingSpace } from '../../parking/entities/parking-space.entity';
import { Reservation } from '../../reservations/entities/reservation.entity';
import { Rate } from '../../rates/entities/rate.entity';
import { Payment } from '../../payments/entities/payment.entity';

@Entity({ name: 'tickets', comment: 'Tickets table' })
export class Ticket extends AuditEntity {
  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'Check-in time',
  })
  entranceAt: Date;

  @Column({ type: 'timestamp', nullable: true, comment: 'Exit time' })
  exitAt: Date | null;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.ACTIVE,
    comment: 'Ticket status',
  })
  status: TicketStatus;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    comment: 'Ticket amount',
  })
  amount: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: 'Hourly rate snapshot captured at check-in',
  })
  rateAmount: string;

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.tickets)
  vehicle: Vehicle; // Muchos tickets pueden pertenecer a un solo vehículo

  @ManyToOne(() => User, (user) => user.tickets)
  user: User; // Muchos tickets pueden pertenecer a un solo usuario

  @ManyToOne(() => ParkingSpace, (spot) => spot.tickets)
  spot: ParkingSpace; // Muchos tickets pueden pertenecer a un solo espacio de estacionamiento

  @OneToOne(() => Reservation, (reservation) => reservation.ticket, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'reservation_id' })
  reservation: Reservation | null;

  @ManyToOne(() => Rate, (rate) => rate.tickets, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  rate: Rate | null;

  @OneToOne(() => Payment, (payment) => payment.ticket)
  payment: Payment | null;
}
