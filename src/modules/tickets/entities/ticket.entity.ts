import { Column, OneToOne, Entity, ManyToOne } from 'typeorm';
import { TicketStatus } from '../enum/ticket-status.enum';
import { AuditEntity } from '../../../shared/base/audit.entity';
import { Vehicle } from '../../vehicles/entities/vehicle.entity';
import { User } from '../../users/entities/users.entity';
import { ParkingSpace } from '../../parking/entities/parking-space.entity';

@Entity({ name: 'tickets', comment: 'Tickets table' })
export class Ticket extends AuditEntity {
  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'Check-in time',
  })
  entranceAt: Date;

  @Column({ type: 'timestamp', comment: 'Exit time' })
  exitAt: Date;

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

  @ManyToOne(() => Vehicle)
  vehicle: Vehicle; // Muchos tickets pueden pertenecer a un solo vehículo

  @ManyToOne(() => User)
  user: User; // Muchos tickets pueden pertenecer a un solo usuario

  @ManyToOne(() => ParkingSpace)
  spot: ParkingSpace; // Muchos tickets pueden pertenecer a un solo espacio de estacionamiento
}
