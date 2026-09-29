import { Column, Entity, Index, ManyToOne, OneToMany } from 'typeorm';
import { AuditEntity } from '../../../shared/base/audit.entity';
import { ParkingLot } from '../../parking/entities/parking-lot.entity';
import { RateType } from '../enum/rate-type.enum';
import { Ticket } from '../../tickets/entities/ticket.entity';

@Entity({ name: 'rates', comment: 'Historical parking rates' })
@Index('idx_rates_lookup', ['parkingLot', 'type', 'validFrom', 'validTo'])
export class Rate extends AuditEntity {
  @Column({ type: 'enum', enum: RateType, comment: 'Rate billing period' })
  type: RateType;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: 'Rate amount' })
  amount: number;

  @Column({ type: 'timestamp', comment: 'Start of rate validity' })
  validFrom: Date;

  @Column({ type: 'timestamp', nullable: true, comment: 'End of rate validity' })
  validTo: Date | null;

  @Column({ type: 'boolean', default: true, comment: 'Whether the rate can be used' })
  isActive: boolean;

  @ManyToOne(() => ParkingLot, (parkingLot) => parkingLot.rates, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  parkingLot: ParkingLot;

  @OneToMany(() => Ticket, (ticket) => ticket.rate)
  tickets: Ticket[];
}