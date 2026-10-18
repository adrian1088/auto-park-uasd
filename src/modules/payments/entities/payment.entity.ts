import { AuditEntity } from '../../../shared/base/audit.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
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

  @Column({
    type: 'timestamp',
    comment: 'Payment date',
    default: () => 'CURRENT_TIMESTAMP',
  })
  paymentDate: Date;

  @Column({ type: 'enum', enum: PaymentMethod, comment: 'Payment method' })
  paymentMethod: PaymentMethod;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Transaction reference for the payment',
  })
  transactionReference: string | null;

  @ManyToOne(() => User, (user) => user.payments)
  user: User | null;

  @OneToOne(() => Ticket, (ticket) => ticket.payment, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;
}
