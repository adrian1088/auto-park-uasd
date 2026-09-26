import { Column, Entity, ManyToOne } from 'typeorm';
import { AuditEntity } from '../../../shared/base/audit.entity';
import { User } from '../../users/entities/users.entity';
import { ParkingSpace } from '../../parking/entities/parking-space.entity';

@Entity({ name: 'reservations', comment: 'Reservations table' })
export class Reservation extends AuditEntity {
  @Column({ type: 'timestamp', comment: 'Start time of the reservation' })
  startTime: Date;

  @Column({ type: 'timestamp', comment: 'End time of the reservation' })
  endTime: Date;

  // Mucho a uno:
  // Muchas reservas pueden ser hechas por un solo usuario
  @ManyToOne(() => User)
  user: User;
  
  // Mucho a uno:
  // Muchos espacios de estacionamiento pueden tener muchas reservas
  @ManyToOne(() => ParkingSpace)
  parkingSpace: ParkingSpace;
}
