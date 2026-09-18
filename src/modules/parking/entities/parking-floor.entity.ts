import { Column, Entity, OneToMany } from 'typeorm';
import { AuditEntity } from '../../../shared/base/audit.entity';
import { ParkingFloorStatus } from '../enum/parking-floor-status.enum';
import { ParkingSpot } from './parking-spot.entity';

@Entity({ name: 'parking_floors', comment: 'Parking floors table' })
export class ParkingFloor extends AuditEntity {
  @Column({ type: 'int', comment: 'Floor number of the parking' })
  floorNumber: number;

  @Column({
    type: 'enum',
    enum: ParkingFloorStatus,
    comment: 'Status of the parking floor',
  })
  status: ParkingFloorStatus;

  @OneToMany(() => ParkingSpot, (spot) => spot.id)
  spots: ParkingSpot[];
}
