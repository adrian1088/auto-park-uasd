import { AuditEntity } from '../../../shared/base/audit.entity';
import { Column, Entity, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { PaymentMethod } from '../enum/payment-method.enum';
import { User } from '../../users/entities/users.entity';
import { Ticket } from '../../tickets/entities/ticket.entity';

@Entity({ name: 'payments', comment: 'Payments table' })
export class Payment extends AuditEntity {
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    comment: 'Payment amount',
  })
  amount: number;

  @Column({ type: 'timestamp', comment: 'Payment date' })
  paymentDate: Date;

  @Column({ type: 'enum', enum: PaymentMethod, comment: 'Payment method' })
  paymentMethod: PaymentMethod;

  @ManyToOne(() => User)
  user: User;

  @OneToOne(() => Ticket)
  ticket: Ticket;
}
