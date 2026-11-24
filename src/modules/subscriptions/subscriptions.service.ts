import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets, EntityManager } from 'typeorm';
import * as crypto from 'crypto';
import { Subscription } from './entities/subscription.entity';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { FilterSubscriptionPaginatedDto } from './dto/subscription.dto';
import { SubscriptionStatus } from './enum/subscription-status.enum';
import { PaymentsService } from '../payments/payments.service';
import { MailService } from '../mail/mail.service';

export enum ParkingSpaceStatus {
  FREE = 'FREE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE',
}

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    private readonly paymentsService: PaymentsService,
    private readonly mailService: MailService,
  ) {}

  private async setSpaceStatus(
    manager: EntityManager,
    spaceId: number,
    status: ParkingSpaceStatus,
    checkAvailability = false,
  ): Promise<void> {
    const space = await manager.findOne('ParkingSpace', {
      where: { id: spaceId },
    });

    if (!space) {
      throw new NotFoundException(`Espacio de parqueo #${spaceId} no encontrado.`);
    }

    const currentStatus = (space as any).status;
    if (
      checkAvailability &&
      status === ParkingSpaceStatus.RESERVED &&
      currentStatus !== ParkingSpaceStatus.FREE
    ) {
      throw new BadRequestException(
        `El espacio ${(space as any).spaceNumber || `#${spaceId}`} no está disponible (estado actual: ${currentStatus}).`,
      );
    }

    await manager.update('ParkingSpace', { id: spaceId }, { status });
  }

  async create(createDto: CreateSubscriptionDto, currentUser?: any): Promise<Subscription> {
    try {
      if (createDto.plateNumbers && createDto.plateNumbers.trim() !== '') {
        await this.validatePlateUniqueness(createDto.plateNumbers);
      }

      let paymentAmount = 3000;
      try {
        const rate = await this.subscriptionRepository.manager.findOne('Rate', {
          where: { id: createDto.rateId },
        });
        if (rate && (rate as any).amount) {
          paymentAmount = Number((rate as any).amount);
        }
      } catch (e) {
        console.error('Error al obtener la tarifa para la suscripción:', e);
      }

      const qrCodeToken = `SUB-QR-${crypto.randomUUID()}`;
      const normalizedSpaceId = createDto.parkingSpaceId
        ? Number(createDto.parkingSpaceId)
        : null;

      const savedSub = await this.subscriptionRepository.manager.transaction(
        async (manager) => {
          if (normalizedSpaceId) {
            await this.setSpaceStatus(
              manager,
              normalizedSpaceId,
              ParkingSpaceStatus.RESERVED,
              true,
            );
          }

          const subscription = manager.create(Subscription, {
            ...createDto,
            plateNumbers: createDto.plateNumbers || null,
            parkingSpaceId: normalizedSpaceId,
            qrCode: qrCodeToken,
            emailSent: false,
          });

          return await manager.save(Subscription, subscription);
        },
      );

      const subscriptionWithRelations = await this.findOne(savedSub.id);

      if (subscriptionWithRelations.user?.email) {
        const spaceNumber =
          subscriptionWithRelations.parkingSpace?.spaceNumber || 'Asignado 24/7';
        const mailPayload = {
          to: subscriptionWithRelations.user.email,
          data: {
            name: subscriptionWithRelations.user.name,
            spaceNumber,
            qrCode: qrCodeToken,
            startDate: subscriptionWithRelations.startDate,
            endDate: subscriptionWithRelations.endDate,
          },
        };

        try {
          await this.mailService.sendSubscriptionQrEmail(mailPayload);
          subscriptionWithRelations.emailSent = true;
          await this.subscriptionRepository.save(subscriptionWithRelations);
        } catch (mailError: any) {
          console.error('[SUB-MAIL][ERROR ENVIANDO QR]', {
            message: mailError?.message,
            code: mailError?.code,
            path: mailError?.path,
            stack: mailError?.stack,
            payload: mailPayload,
          });
        }
      }

      // Registra el pago inicial de la suscripción en la tabla payments
      await this.paymentsService.createSubscriptionPayment(
        {
          amount: paymentAmount,
          paymentMethod: (createDto as any).paymentMethod || 'CASH',
          userId: savedSub.userId,
        },
        currentUser,
      );

      return subscriptionWithRelations;
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      console.error('Error crítico al crear suscripción:', error);
      throw new InternalServerErrorException(
        error?.message || 'Ocurrió un error inesperado al registrar el cliente fijo.',
      );
    }
  }

  async findAll(): Promise<Subscription[]> {
    return await this.subscriptionRepository.find({
      relations: {
        user: true,
        rate: true,
        parkingSpace: {
          floor: true,
        },
      } as any,
    });
  }

  async findPaginated(filter: FilterSubscriptionPaginatedDto) {
    const { page = 1, limit = 10, search, status } = filter;
    const query = this.subscriptionRepository
      .createQueryBuilder('sub')
      .leftJoinAndSelect('sub.user', 'user')
      .leftJoinAndSelect('sub.rate', 'rate')
      .leftJoinAndSelect('rate.parkingLot', 'parkingLot')
      .leftJoinAndSelect('sub.parkingSpace', 'parkingSpace');

    if (status) {
      query.andWhere('sub.status = :status', { status });
    }

    if (search) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('user.name ILIKE :search', { search: `%${search}%` })
            .orWhere('user.email ILIKE :search', { search: `%${search}%` })
            .orWhere('sub.plateNumbers ILIKE :search', {
              search: `%${search}%`,
            })
            .orWhere('sub.qrCode ILIKE :search', { search: `%${search}%` });
        }),
      );
    }

    query.skip((page - 1) * limit).take(limit);
    query.orderBy('sub.createdAt', 'DESC');

    const [data, total] = await query.getManyAndCount();
    return { data, total };
  }

  async findOne(id: number): Promise<Subscription> {
    const sub = await this.subscriptionRepository.findOne({
      where: { id },
      relations: {
        user: true,
        rate: true,
        parkingSpace: {
          floor: true,
        },
      } as any,
    });
    if (!sub) throw new NotFoundException(`Suscripción #${id} no encontrada`);
    return sub;
  }

  async update(
    id: number,
    updateDto: UpdateSubscriptionDto,
  ): Promise<Subscription> {
    const sub = await this.findOne(id);

    if (updateDto.plateNumbers && updateDto.plateNumbers !== sub.plateNumbers) {
      await this.validatePlateUniqueness(updateDto.plateNumbers, id);
    }

    const previousSpaceId = sub.parkingSpaceId ? Number(sub.parkingSpaceId) : null;
    const hasSpaceChange = updateDto.parkingSpaceId !== undefined;
    const nextSpaceId = hasSpaceChange
      ? updateDto.parkingSpaceId
        ? Number(updateDto.parkingSpaceId)
        : null
      : previousSpaceId;

    const saved = await this.subscriptionRepository.manager.transaction(
      async (manager) => {
        if (hasSpaceChange && previousSpaceId !== nextSpaceId) {
          if (previousSpaceId) {
            await this.setSpaceStatus(
              manager,
              previousSpaceId,
              ParkingSpaceStatus.FREE,
              false,
            );
          }
          if (nextSpaceId) {
            await this.setSpaceStatus(
              manager,
              nextSpaceId,
              ParkingSpaceStatus.RESERVED,
              true,
            );
          }
        }

        Object.assign(sub, updateDto);
        sub.parkingSpaceId = nextSpaceId;

        return await manager.save(Subscription, sub);
      },
    );

    return await this.findOne(saved.id);
  }

  async renew(
    id: number,
    renewDto: { amount?: number; paymentMethod: any },
    currentUser: any,
  ): Promise<Subscription> {
    const sub = await this.findOne(id);

    const paymentAmount = renewDto.amount
      ? Number(renewDto.amount)
      : Number(sub.rate?.amount || 3000);

    // Registra el pago de renovación en la tabla payments
    await this.paymentsService.createSubscriptionPayment(
      {
        amount: paymentAmount,
        paymentMethod: renewDto.paymentMethod || 'CASH',
        userId: sub.userId,
      },
      currentUser,
    );

    const baseDate =
      new Date() > new Date(sub.endDate) ? new Date() : new Date(sub.endDate);
    const newEndDate = new Date(baseDate);
    newEndDate.setMonth(newEndDate.getMonth() + 1);

    sub.startDate = baseDate.toISOString() as any;
    sub.endDate = newEndDate.toISOString() as any;
    sub.status = SubscriptionStatus.ACTIVE;

    const saved = await this.subscriptionRepository.save(sub);
    return await this.findOne(saved.id);
  }

  // Entrada en garita por QR de suscripción: pasa el espacio a OCCUPIED y retorna ticket visual sin guardar en tabla tickets
  async checkInByQr(rawCode: string) {
    const sub = await this.findAndValidateActiveSubscriptionByQr(rawCode);
    const spaceId = sub.parkingSpace?.id ?? sub.parkingSpaceId;

    if (!spaceId) {
      throw new BadRequestException(
        'La suscripción no tiene un espacio de parqueo asignado.',
      );
    }

    await this.subscriptionRepository.manager.transaction(async (manager) => {
      await this.setSpaceStatus(
        manager,
        Number(spaceId),
        ParkingSpaceStatus.OCCUPIED,
        false,
      );
    });

    const updatedSub = await this.findOne(sub.id);
    const firstPlate =
      updatedSub.plateNumbers
        ?.split(',')
        .map((p) => p.trim().toUpperCase())
        .find(Boolean) || 'ABONADO';

    const now = new Date();
    return {
      isSubscriptionPass: true,
      subscriptionId: updatedSub.id,
      qrCode: updatedSub.qrCode,
      code: `SUB-${updatedSub.id}-${Date.now().toString().slice(-5)}`,
      plateNumber: firstPlate,
      clientName: updatedSub.user?.name || 'Cliente Fijo',
      parkingSpaceId: Number(spaceId),
      parkingLotId: (updatedSub.rate as any)?.parkingLot?.id ?? 1,
      assignedSpace: updatedSub.parkingSpace?.spaceNumber || `#${spaceId}`,
      entranceAt: now.toISOString(),
    };
  }

  // Salida por QR de suscripción: libera el espacio al salir
  async checkOutByQr(rawCode: string) {
    const code = String(rawCode ?? '').trim();
    if (!code) {
      throw new BadRequestException('Debes proporcionar un código QR de suscripción.');
    }

    const sub = await this.subscriptionRepository.findOne({
      where: { qrCode: code },
      relations: { user: true, parkingSpace: true } as any,
    });

    if (!sub) {
      throw new NotFoundException('No se encontró ninguna suscripción con ese código QR.');
    }

    const spaceId = sub.parkingSpace?.id ?? sub.parkingSpaceId;
    if (spaceId) {
      await this.subscriptionRepository.manager.transaction(async (manager) => {
        await this.setSpaceStatus(
          manager,
          Number(spaceId),
          ParkingSpaceStatus.FREE,
          false,
        );
      });
    }

    return {
      released: true,
      subscriptionId: sub.id,
      qrCode: sub.qrCode,
      parkingSpaceId: spaceId ? Number(spaceId) : null,
      assignedSpace: sub.parkingSpace?.spaceNumber || (spaceId ? `#${spaceId}` : null),
      exitAt: new Date().toISOString(),
    };
  }

  async remove(id: number): Promise<Subscription> {
    const sub = await this.findOne(id);
    const spaceId = sub.parkingSpaceId ? Number(sub.parkingSpaceId) : null;

    return await this.subscriptionRepository.manager.transaction(
      async (manager) => {
        const removed = await manager.remove(Subscription, sub);
        if (spaceId) {
          await this.setSpaceStatus(manager, spaceId, ParkingSpaceStatus.FREE, false);
        }
        return removed;
      },
    );
  }

  private async findAndValidateActiveSubscriptionByQr(
    rawCode: string,
  ): Promise<Subscription> {
    const code = String(rawCode ?? '').trim();
    if (!code) {
      throw new BadRequestException('Debes proporcionar un código QR de suscripción.');
    }

    const sub = await this.subscriptionRepository.findOne({
      where: { qrCode: code },
      relations: {
        user: true,
        rate: { parkingLot: true },
        parkingSpace: { floor: { lot: true } },
      } as any,
    });

    if (!sub) {
      throw new NotFoundException('No se encontró ninguna suscripción con ese código QR.');
    }

    if (sub.status !== SubscriptionStatus.ACTIVE) {
      throw new ConflictException('La suscripción no se encuentra activa.');
    }

    const now = new Date();
    const start = new Date(sub.startDate);
    const end = new Date(sub.endDate);

    if (now < start) {
      throw new ConflictException('La suscripción aún no ha iniciado su vigencia.');
    }

    if (now > end) {
      throw new ConflictException('La suscripción está vencida.');
    }

    return sub;
  }

  private async validatePlateUniqueness(
    plateNumbers: string,
    excludeId?: number,
  ) {
    const newPlates = plateNumbers
      .split(',')
      .map((p) => p.trim().toUpperCase());
    const activeSubs = await this.subscriptionRepository.find({
      where: { status: SubscriptionStatus.ACTIVE },
    });

    for (const sub of activeSubs) {
      if (excludeId && sub.id === excludeId) continue;
      if (!sub.plateNumbers) continue;

      const existingPlates = sub.plateNumbers
        .split(',')
        .map((p) => p.trim().toUpperCase());
      const conflict = newPlates.some((plate) =>
        existingPlates.includes(plate),
      );
      if (conflict) {
        throw new BadRequestException(
          `La placa ingresada ya se encuentra registrada en otra suscripción activa. Verifique e intente con otra placa.`,
        );
      }
    }
  }
}