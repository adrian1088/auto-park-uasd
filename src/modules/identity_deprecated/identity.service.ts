import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivationTokenEntity } from '../tokens/entities/activation-token.entity';
import { UserEntity } from '../users/entities/users.entity';
import { PasswordHasherService } from '../../shared/password-hasher/password-hasher.service';
import { IdentityInvitationStatus } from './enums/identity-invitation-status.enum';
import { UserStatus } from '../users/enums/users-status.enum';
import { MailService } from '../mail/mail.service';

@Injectable()
export class IdentityService {
  constructor(
    @InjectRepository(ActivationTokenEntity)
    private readonly invitationRepository: Repository<ActivationTokenEntity>,
    @InjectRepository(UserEntity) private readonly userRepository: Repository<UserEntity>,
    private readonly passwordHasher: PasswordHasherService,
    private readonly mailService: MailService,
  ) {}

  // async createInvitation(input: {
  //   userId: number;
  //   ttlHours: number;
  //   invitedByUserId?: number;
  // }): Promise<ActivationTokenEntity> {
  //   const existingPending = await this.invitationRepository.findOne({
  //     where: { userId: input.userId, status: IdentityInvitationStatus.PENDING },
  //     order: { createdAt: 'DESC' },
  //   });

  //   if (existingPending && existingPending.expiresAt.getTime() > Date.now()) {
  //     throw new ConflictException(
  //       'Ya existe una invitación pendiente para este correo electrónico.',
  //     );
  //   }
  //   const token = randomUUID();
  //   const invitation = this.invitationRepository.create({
  //     userId: input.userId,
  //     tokenHash: token,
  //     status: IdentityInvitationStatus.PENDING,
  //     invitedByUserId: input.invitedByUserId ?? null,
  //     expiresAt: new Date(Date.now() + input.ttlHours * 60 * 60 * 1000),
  //     acceptedAt: null,
  //   });

  //   const savedInvitation = await this.invitationRepository.save(invitation);
  //   const user = await this.userRepository.findOne({ where: { id: input.userId } });
  //   if (user) {
  //     await this.mailService.userSignUp({
  //       to: user.email,
  //       data: { hash: token },
  //     });
  //   }
  //   return savedInvitation;
  // }

  // async acceptInvitation(
  //   token: string,
  //   plainPassword: string,
  // ): Promise<ActivationTokenEntity> {
  //   const invitation = await this.invitationRepository.findOne({
  //     where: { tokenHash: token },
  //   });
  //   if (!invitation) {
  //     throw new NotFoundException('Invitación no encontrada');
  //   }

  //   if (
  //     invitation.status !== IdentityInvitationStatus.PENDING ||
  //     invitation.expiresAt.getTime() <= Date.now()
  //   ) {
  //     invitation.status = IdentityInvitationStatus.EXPIRED;
  //     await this.invitationRepository.save(invitation);
  //     throw new ConflictException('Invitación expirada o ya utilizada');
  //   }

  //   const now = new Date();
  //   const user = await this.userRepository.findOne({ where: { id: invitation.userId } });
  //   const email = user?.email;
  //   const passwordHash = await this.passwordHasher.hash(plainPassword);
  //   const existingUser = await this.userRepository.findOne({
  //     where: { email: email },
  //   });

  //   if (existingUser?.status === UserStatus.ACTIVE) {
  //     throw new ConflictException(
  //       'Una cuenta activa con el correo de invitación ya existe',
  //     );
  //   }

  //   if (existingUser) {
  //     existingUser.password = passwordHash;
  //     existingUser.status = UserStatus.ACTIVE;
  //     await this.userRepository.update(existingUser.id, existingUser);
  //   } else {
  //     const newUser = await this.userRepository.create({
  //       name: user?.name,
  //       email,
  //       phone: user?.phone,
  //       password: passwordHash,
  //       status: UserStatus.ACTIVE,
  //     });
  //     await this.userRepository.save(newUser);
  //   }

  //   invitation.status = IdentityInvitationStatus.ACCEPTED;
  //   invitation.acceptedAt = now;
  //   return this.invitationRepository.save(invitation);
  // }

  // async listInvitations(
  //   page: number,
  //   limit: number,
  // ): Promise<{ invitations: ActivationTokenEntity[]; total: number }> {
  //   const [invitations, total] = await this.invitationRepository.findAndCount({
  //     order: { createdAt: 'DESC' },
  //     take: limit,
  //     skip: (page - 1) * limit,
  //   });

  //   return { invitations, total };
  // }
}
