import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import type { FindOptionsWhere } from 'typeorm';
import { UserRole } from './enums/users-role.enum';
import { UserSource } from './enums/user-resource.enum';
import { MailService } from '../mail/mail.service';
import { TokensService } from '../tokens/services/tokens.service';
import { UserStatus } from './enums/users-status.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResponsePaginatedDto } from '../../shared/dtos/response-paginated.dto';
import { PasswordHasherService } from '../../shared/password-hasher/password-hasher.service';
import { FilterUserPaginatedDto } from './dto/find-users.dto';
import { UserEntity } from './entities/users.entity';
import { ConfigService } from '@nestjs/config';
import { AppConfigType } from '../../config/app-config.type';
import { randomUUID } from 'node:crypto';

export type PublicUser = Omit<UserEntity, 'password'>;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
    private readonly passwordHasherService: PasswordHasherService,
    private readonly tokensService: TokensService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async create(newUser: {
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    password?: string;
    activatedAt?: Date;
    status?: UserStatus;
    source?: UserSource;
  }): Promise<PublicUser> {
    const config = this.configService.getOrThrow<AppConfigType>('app');
    const password = await this.passwordHasherService.hash(randomUUID());

    await this.ensureEmailAvailable(newUser.email);
    const user = this.repo.create({
      ...newUser,
      password,
      status: newUser.status ?? UserStatus.PENDING_ACTIVATION,
    });
    const savedUser = await this.repo.save(user);
    const tokens = await this.tokensService.create({
      userId: savedUser.id,
      ttlHours: config.defaultTokenActivationTtlHours,
    });

    if (savedUser && tokens) {
      await this.mailService.sendTokenActivationEmail({
        to: savedUser.email,
        data: { hash: tokens.token, url: 'activate-email-password' },
      });
    }
    return this.toPublicUser(savedUser);
  }

  async findAll({
    page,
    limit,
  }: FilterUserPaginatedDto): Promise<ResponsePaginatedDto<PublicUser>> {
    const [users, total] = await this.repo.findAndCount({
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        name: true,
        email: true,
        role: true,
        status: true,
        phone: true,
      },
      order: { id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return ResponsePaginatedDto.fromDataAndMeta({
      data: users.map((user) => this.toPublicUser(user)),
      total,
      page,
      limit,
    });
  }

  async findOne({
    id,
    email,
  }: {
    id?: number;
    email?: string;
  }): Promise<PublicUser> {
    const where: FindOptionsWhere<UserEntity> = { id, ...(email ? { email } : {}) };

    const user = await this.repo.findOne({
      where,
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        name: true,
        email: true,
        role: true,
        status: true,
        phone: true,
      },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return this.toPublicUser(user);
  }

  async update(id: number, data: Partial<UserEntity>): Promise<PublicUser> {
    const user = await this.findEntity(id);
    if (data.email && data.email !== user.email) {
      await this.ensureEmailAvailable(data.email, id);
    }
    // TODO: Eliminar cuando se implemente cambiar contraseña
    if (data.password) {
      data.password = await this.passwordHasherService.hash(data.password);
    }

    Object.assign(user, data);
    const savedUser = await this.repo.save(user);
    return this.toPublicUser(savedUser);
  }

  async remove(id: number): Promise<PublicUser> {
    const user = await this.findEntity(id);
    user.status = UserStatus.INACTIVE;
    const savedUser = await this.repo.save(user);
    return this.toPublicUser(savedUser);
  }

  private async findEntity(id: number): Promise<UserEntity> {
    const user = await this.repo.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  async ensureEmailAvailable(
    email: string,
    excludedId?: number,
  ): Promise<void> {
    const existingUser = await this.repo.findOneBy({ email });
    if (existingUser && existingUser.id !== excludedId) {
      throw new ConflictException('El email ya está registrado');
    }
  }

  private toPublicUser(user: UserEntity): PublicUser {
    const { password: _password, ...publicUser } = user;
    return publicUser;
  }
}
