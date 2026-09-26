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

  // Mucho a uno:
  // Muchas reservas pueden ser hechas por un solo usuario
  @ManyToOne(() => User, (user) => user.reservations)
  user: User;
  
  // Mucho a uno:
  // Muchos espacios de estacionamiento pueden tener muchas reservas
  @ManyToOne(() => ParkingSpace, (parkingSpace) => parkingSpace.reservations)
  parkingSpace: ParkingSpace;

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.reservations, { nullable: true })
  vehicle: Vehicle | null;

  @OneToOne(() => Ticket, (ticket) => ticket.reservation)
  ticket: Ticket | null;
}
