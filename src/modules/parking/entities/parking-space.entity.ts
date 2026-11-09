import { Column, Entity, ManyToOne, OneToMany, Unique } from 'typeorm';
import { AuditEntity } from '../../../shared/base/audit.entity';
import { ParkingFloor } from './parking-floor.entity';
import { ParkingSpaceStatus } from '../enum/parking-space-status.enum';
import { ParkingSpaceType } from '../enum/parking-space-type.enum';
import { ReservationEntity } from '../../reservations/entities/reservation.entity';
import { TicketEntity } from '../../tickets/entities/ticket.entity';

@Entity({ name: 'parking_spaces', comment: 'Parking spaces table' })
@Unique(['spaceNumber', 'floor'])
export class ParkingSpace extends AuditEntity {
  @Column({ type: 'varchar', length: 10, comment: 'Number of the parking space' })
  spaceNumber: string;

  @Column({
    type: 'enum',
    enum: ParkingSpaceType,
    comment: 'Type of the parking space',
  })
  type: ParkingSpaceType;

  @Column({
    type: 'enum',
    enum: ParkingSpaceStatus,
    comment: 'Status of the parking space',
  })
  status: ParkingSpaceStatus;

  // Mucho a uno: 
  // Muchos estacionamientos pueden estar en un solo piso
  @ManyToOne(() => ParkingFloor, (floor) => floor.spaces)
  floor: ParkingFloor;

  @OneToMany(() => ReservationEntity, (reservation) => reservation.parkingSpace)
  reservations: ReservationEntity[];

  @OneToMany(() => TicketEntity, (ticket) => ticket.spot)
  tickets: TicketEntity[];
}
