import { AuditEntity } from "../../../shared/base/audit.entity";
import { Column, Entity } from "typeorm";

@Entity({ name: 'parking_lots', comment: 'Parking lots table' })
export class ParkingLot extends AuditEntity{
  @Column({ type: 'varchar', length: 255, comment: 'Name of the parking lot' })
  name: string;

  @Column({ type: 'varchar', length: 255, comment: 'Address of the parking lot' })
  address: string;

  @Column({ type: 'int', comment: 'Capacity of the parking lot' })
  capacity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: 'Hourly rate of the parking lot' })
  hourlyRate: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: 'Daily rate of the parking lot' })
  dailyRate: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: 'Monthly rate of the parking lot' })
  monthlyRate: number;
}