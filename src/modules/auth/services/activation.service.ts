import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivationTokenEntity } from '../../tokens/entities/activation-token.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UserEntity } from '../../users/entities/users.entity';
import { PasswordHasherService } from '../../../shared/password-hasher/password-hasher.service';
import { MailService } from '../../mail/mail.service';
import { UserStatus } from '../../users/enums/users-status.enum';
import { createHash, randomUUID } from 'node:crypto';

@Injectable()
export class ActivationService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(ActivationTokenEntity)
    private readonly activationRepository: Repository<ActivationTokenEntity>,
    private readonly passwordHasher: PasswordHasherService,
    private readonly mailService: MailService,
    private readonly dataSource: DataSource,
  ) {}

  async activate(
    token: string,
    plainPassword?: string,
  ): Promise<ActivationTokenEntity> {
    token = createHash('sha256').update(token).digest('hex');
    const activationToken = await this.activationRepository.findOne({
      where: { tokenHash: token },
    });
    if (!activationToken) {
      throw new NotFoundException('Token de activación no encontrado');
    }

    if (
      activationToken.expiresAt.getTime() <= Date.now() ||
      activationToken.acceptedAt != null
    ) {
      await this.activationRepository.save(activationToken);
      throw new ConflictException(
        'Token de activación expirado o ya utilizado',
      );
    }

    const now = new Date();
    const user = await this.userRepository.findOne({
      where: { id: activationToken.userId },
    });
    const email = user?.email;
    const passwordHash =
      plainPassword !== undefined
        ? await this.passwordHasher.hash(plainPassword)
        : undefined;
    const existingUser = await this.userRepository.findOne({
      where: { email: email },
    });

    if (existingUser?.status === UserStatus.ACTIVE) {
      throw new ConflictException(
        'Ya existe una cuenta activa con este correo',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      if (existingUser) {
        if (passwordHash !== undefined) {
          existingUser.password = passwordHash;
        }
        existingUser.status = UserStatus.ACTIVE;
        existingUser.activatedAt = now;
        await manager
          .getRepository(UserEntity)
          .update(existingUser.id, existingUser);
      } else {
        if (passwordHash === undefined) {
          throw new BadRequestException(
            'Se requiere una contraseña para crear la cuenta',
          );
        }

        const newUser = await manager.getRepository(UserEntity).create({
          name: user?.name,
          email,
          phone: user?.phone,
          password: passwordHash,
          status: UserStatus.ACTIVE,
          activatedAt: now,
        });
        await manager.getRepository(UserEntity).save(newUser);
      }

      activationToken.acceptedAt = now;
      return await manager
        .getRepository(ActivationTokenEntity)
        .save(activationToken);
    });
  }

  async resendActivationEmail(email: string): Promise<ActivationTokenEntity> {
    const user = await this.userRepository.findOne({
      where: { email },
    });
    if (!user) {
      throw new NotFoundException('Email del usuario no encontrado');
    }

    // 1. Generar un nuevo token de activación y su hash
    const token = randomUUID();
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const newActivationToken = this.activationRepository.create({
      userId: user.id,
      tokenHash: tokenHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
    });
    await this.activationRepository.save(newActivationToken);

    // 2. Invaliudar token anterior
    await this.activationRepository.update(
      { userId: user.id, acceptedAt: null },
      { expiresAt: new Date() },
    );

    // 3. Enviar el correo de activación con el token generado
    await this.mailService.sendTokenActivationEmail({
      to: user.email,
      data: {
        hash: tokenHash,
        url: 'activate-email',
      },
    });
    return newActivationToken;
  }

  async listInvitations(
    page: number,
    limit: number,
  ): Promise<{ invitations: ActivationTokenEntity[]; total: number }> {
    const [invitations, total] = await this.activationRepository.findAndCount({
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return { invitations, total };
  }
}
