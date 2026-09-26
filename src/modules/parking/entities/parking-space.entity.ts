import { Column, Entity, ManyToOne, OneToOne } from 'typeorm';
import { AuditEntity } from '../../../shared/base/audit.entity';
import { ParkingFloor } from './parking-floor.entity';
import { ParkingSpaceStatus } from '../enum/parking-space-status.enum';
import { ParkingSpaceType } from '../enum/parking-space-type.enum';

@Entity({ name: 'parking_spaces', comment: 'Parking spaces table' })
export class ParkingSpace extends AuditEntity {
  @Column({ type: 'int', comment: 'Number of the parking spot' })
  spaceId: number;

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
}
