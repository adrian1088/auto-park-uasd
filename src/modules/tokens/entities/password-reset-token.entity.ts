import { Column, ManyToOne, Entity } from 'typeorm';
import { AuditEntity } from '../../../shared/base/audit.entity';
import { UserEntity } from '../../users/entities/users.entity';

@Entity({ name: 'password_reset_tokens' , comment: 'Tokens de restablecimiento de contraseña' })
export class PasswordResetTokenEntity extends AuditEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  tokenHash: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  usedAt?: Date;

  @Column({ type: 'int' })
  userId: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  user: UserEntity;
}
