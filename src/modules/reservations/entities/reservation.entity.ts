import { Column, Entity, ManyToOne, OneToOne } from 'typeorm';
import { AuditEntity } from '../../../shared/base/audit.entity';
import { UserEntity } from '../../users/entities/users.entity';
import { ParkingSpace } from '../../parking/entities/parking-space.entity';
import { TicketEntity } from '../../tickets/entities/ticket.entity';

@Entity({ name: 'reservations', comment: 'Reservations table' })
export class ReservationEntity extends AuditEntity {
  @Column({ type: 'timestamp', comment: 'Start time of the reservation' })
  startTime: Date;

  @Column({ type: 'timestamp', comment: 'End time of the reservation' })
  endTime: Date;

  @Column({ type: 'int', nullable: true, comment: 'User ID' })
  userId: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true, comment: 'Vehicle ID' })
  vehiclePlateNumber: string | null;

  @Column({ type: 'int', nullable: false, comment: 'Parking space ID' })
  parkingSpaceId: number;

  // Mucho a uno:
  // Muchas reservas pueden ser hechas por un solo usuario
  @ManyToOne(() => UserEntity, (user) => user.reservations)
  user: UserEntity | null;

  // Mucho a uno:
  // Muchos espacios de estacionamiento pueden tener muchas reservas
  @ManyToOne(() => ParkingSpace, (parkingSpace) => parkingSpace.reservations)
  parkingSpace: ParkingSpace;

  @OneToOne(() => TicketEntity, (ticket) => ticket.reservation)
  ticket: TicketEntity | null;
}
