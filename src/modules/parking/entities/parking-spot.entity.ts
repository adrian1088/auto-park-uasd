import {
  Column,
  Entity,
  OneToOne,
} from 'typeorm';
import { AuditEntity } from '../../../shared/base/audit.entity';
import { ParkingFloor } from './parking-floor.entity';
import { ParkingSpotType } from '../enum/parking-spot-type.enum';
import { ParkingSpotStatus } from '../enum/parking-spot-status.enum';

@Entity({ name: 'parking_spots', comment: 'Parking spots table' })
export class ParkingSpot extends AuditEntity {
  @Column({ type: 'int', comment: 'Number of the parking spot' })
  spotNumber: number;

  @Column({
    type: 'enum',
    enum: ParkingSpotType,
    comment: 'Type of the parking spot',
  })
  type: ParkingSpotType;

  @Column({
    type: 'enum',
    enum: ParkingSpotStatus,
    comment: 'Status of the parking spot',
  })
  status: ParkingSpotStatus;

  @OneToOne(() => ParkingFloor, (parkingFloor) => parkingFloor.id)
  parkingFloor: ParkingFloor;
}
