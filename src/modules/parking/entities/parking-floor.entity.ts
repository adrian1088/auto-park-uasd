import { Column, Entity, OneToMany, ManyToOne } from 'typeorm';
import { ParkingLot } from './parking-lot.entity';
import { AuditEntity } from '../../../shared/base/audit.entity';
import { ParkingFloorStatus } from '../enum/parking-floor-status.enum';
import { ParkingSpace } from './parking-space.entity';

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

  // Mucho a uno: 
  // Muchos pisos de estacionamiento pertenecen a una sola ubicacion de estacionamiento
  @ManyToOne(() => ParkingLot)
  parkingLot: ParkingLot;

  // Uno a Mucho:
  // Un piso de estacionamiento puede tener muchos espacios de estacionamiento
  @OneToMany(() => ParkingSpace, (space) => space.floor)
  spaces: ParkingSpace[];
}
