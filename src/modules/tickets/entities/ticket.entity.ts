import { Column, OneToOne, Entity, ManyToOne, JoinColumn, BeforeInsert } from 'typeorm';
import { TicketStatus } from '../enum/ticket-status.enum';
import { AuditEntity } from '../../../shared/base/audit.entity';
import { VehicleEntity } from '../../vehicles/entities/vehicle.entity';
import { UserEntity } from '../../users/entities/users.entity';
import { ParkingSpace } from '../../parking/entities/parking-space.entity';
import { ReservationEntity } from '../../reservations/entities/reservation.entity';
import { RateEntity } from '../../rates/entities/rate.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { randomUUID } from 'node:crypto';

@Entity({ name: 'tickets', comment: 'Tickets table' })
export class TicketEntity extends AuditEntity {
  @Column({
    type: 'varchar',
    length: 50,
    unique: true,
    comment: 'Ticket code',
  })
  code: string;
  
  @BeforeInsert()
  generateCode() {
    this.code = `TCK-${new Date().getFullYear()}-${randomUUID()}`;
  }
  
  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'Check-in time',
  })
  entranceAt: Date;

  @Column({ type: 'timestamp', nullable: true, comment: 'Exit time' })
  exitAt: Date | null;

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
    default: 0,
    comment: 'Hourly rate snapshot captured at check-in',
  })
  rateAmount: number;

 @Column({ type: 'int', nullable: true, comment: 'User ID' })
  userId: number | null;

  @Column({ type: 'varchar', length: 20, comment: 'Vehicle plate number' })
  vehiclePlateNumber: string;

  //Relaciones
  @ManyToOne(() => VehicleEntity, (vehicle) => vehicle.tickets)
  vehicle: VehicleEntity; // Muchos tickets pueden pertenecer a un solo vehículo
  // @Column({ type: 'varchar', length: 20, comment: 'Vehicle plate number' })
  // plateNumber: string;

  @ManyToOne(() => UserEntity, (user) => user.tickets)
  user: UserEntity | null; // Muchos tickets pueden pertenecer a un solo usuario

  @ManyToOne(() => ParkingSpace, (spot) => spot.tickets)
  spot: ParkingSpace; // Muchos tickets pueden pertenecer a un solo espacio de estacionamiento

  @OneToOne(() => ReservationEntity, (reservation) => reservation.ticket, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'reservation_id' })
  reservation: ReservationEntity | null;

  @ManyToOne(() => RateEntity, (rate) => rate.tickets, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  rate: RateEntity | null;

  @OneToOne(() => Payment, (payment) => payment.ticket)
  payment: Payment | null;
}
