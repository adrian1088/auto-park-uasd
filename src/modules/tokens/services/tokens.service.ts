import { InjectRepository } from '@nestjs/typeorm';
import { ActivationTokenEntity } from '../entities/activation-token.entity';
import { Repository } from 'typeorm';
import { ConflictException, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { CryptoHasherService } from '../../../shared/crypto-hasher/crypto-hasher.service';

@Injectable()
export class TokensService {
  constructor(
    @InjectRepository(ActivationTokenEntity)
    private readonly activationRepository: Repository<ActivationTokenEntity>
  ) {}

  async create(input: {
    userId: number;
    ttlHours: number;
    invitedByUserId?: number;
  }): Promise<ActivationTokenEntity & { token: string }> {
    // 1. Verificar si existe un token pendiente para el usuario
    const existingPending = await this.activationRepository.findOne({
      where: { userId: input.userId },
      order: { createdAt: 'DESC' },
    });

    // 2. Si existe un token pendiente y no ha expirado, lanzar conflicto
    if (existingPending && existingPending.expiresAt.getTime() > Date.now()) {
      throw new ConflictException(
        'Ya existe un token de activación pendiente para este correo electrónico.',
      );
    }
    // 3. Crear un nuevo token de activación
    const token = randomUUID();
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const newActivationToken = this.activationRepository.create({
      userId: input.userId,
      tokenHash: tokenHash,
      createdBy: input.invitedByUserId ?? null,
      expiresAt: new Date(Date.now() + input.ttlHours * 60 * 60 * 1000),
      acceptedAt: null,
    });

    // 4. Guardar el nuevo token de activación en la base de datos
    const savedActivationToken =
      await this.activationRepository.save(newActivationToken);
    return Object.assign(savedActivationToken, { token });
  }
}
