import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, BaseEntity } from 'typeorm';
import { User } from '../../users/entities/users.entity'; 
import { Rate } from '../../rates/entities/rate.entity'; 
import { ParkingSpace } from '../../parking/entities/parking-space.entity';
import { SubscriptionStatus } from '../enum/subscription-status.enum'; 

@Entity('subscriptions')
export class Subscription extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, name: 'plate_numbers', nullable: true })
  plateNumbers: string | null;

  @Column({ type: 'timestamp', name: 'start_date' })
  startDate: Date;

  @Column({ type: 'timestamp', name: 'end_date' })
  endDate: Date;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus;

  @Column({ 
    type: 'varchar', 
    unique: true, 
    name: 'qr_code', 
    comment: 'Unique token encoded in the QR code for subscription access' 
  })
  qrCode: string;

  @Column({ 
    type: 'boolean', 
    default: false, 
    name: 'email_sent', 
    comment: 'Status of the subscription QR email notification' 
  })
  emailSent: boolean;

  // Relación con User 
  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: number;

  // Relación con Rate
  @ManyToOne(() => Rate, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'rate_id' })
  rate: Rate;

  @Column({ name: 'rate_id' })
  rateId: number;

  // Relación y columna para el Espacio de Parqueo Asignado (24/7)
  @ManyToOne(() => ParkingSpace, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parking_space_id' })
  parkingSpace: ParkingSpace;

  @Column({ name: 'parking_space_id', type: 'integer', nullable: true })
  parkingSpaceId: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}