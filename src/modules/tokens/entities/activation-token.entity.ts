import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { AuditEntity } from '../../../shared/base/audit.entity';
import { UserEntity } from '../../users/entities/users.entity';

@Entity({ name: 'activation_tokens', comment: 'Tokens de activación' })
@Index('UQ_activation_tokens_token', ['tokenHash'], { unique: true })
export class ActivationTokenEntity extends AuditEntity {
  @Column({ type: 'varchar', length: 255 })
  tokenHash: string;

  @Column({ type: 'int', nullable: true })
  createdBy!: number | null;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  acceptedAt: Date | null;

  @Column({ type: 'int' })
  userId: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  user: UserEntity;
}
