import {
  BadRequestException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import * as crypto from 'crypto';
import { Subscription } from './entities/subscription.entity';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { FilterSubscriptionPaginatedDto } from './dto/subscription.dto';
import { SubscriptionStatus } from './enum/subscription-status.enum';
import { PaymentsService } from '../payments/payments.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    private readonly paymentsService: PaymentsService,
    private readonly mailService: MailService,
  ) {}

  async create(createDto: CreateSubscriptionDto, currentUser?: any): Promise<Subscription> {
    try {
      // Validar duplicidad de placas solo si se proporcionan placas
      if (createDto.plateNumbers && createDto.plateNumbers.trim() !== '') {
        await this.validatePlateUniqueness(createDto.plateNumbers);
      }

      // Obtener el monto de la tarifa asignada
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

      // Generar token único para el código QR
      const qrCodeToken = `SUB-QR-${crypto.randomUUID()}`;

      // Crear y guardar la suscripción
      const subscription = this.subscriptionRepository.create({
        ...createDto,
        plateNumbers: createDto.plateNumbers || null,
        parkingSpaceId: createDto.parkingSpaceId ? Number(createDto.parkingSpaceId) : null,
        qrCode: qrCodeToken,
        emailSent: false,
      });
      const savedSub = await this.subscriptionRepository.save(subscription);

      const subscriptionWithRelations = await this.findOne(savedSub.id);

      // Enviar correo electrónico con QR usando MailService y plantilla Handlebars
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
          console.log('[SUB-MAIL] Intentando enviar QR a:', mailPayload.to, {
            subscriptionId: subscriptionWithRelations.id,
            spaceNumber,
            qrCode: qrCodeToken,
            startDate: subscriptionWithRelations.startDate,
            endDate: subscriptionWithRelations.endDate,
          });

          await this.mailService.sendSubscriptionQrEmail(mailPayload);

          subscriptionWithRelations.emailSent = true;
          await this.subscriptionRepository.save(subscriptionWithRelations);

          console.log('[SUB-MAIL] Correo QR enviado correctamente a:', mailPayload.to);
        } catch (mailError: any) {
          console.error('[SUB-MAIL][ERROR ENVIANDO QR]', {
            message: mailError?.message,
            code: mailError?.code,
            path: mailError?.path,
            stack: mailError?.stack,
            payload: mailPayload,
          });
        }
      } else {
        console.warn('[SUB-MAIL] La suscripción no tiene user.email, se omite envío de QR:', {
          subscriptionId: subscriptionWithRelations.id,
          userId: subscriptionWithRelations.userId,
        });
      }

      // Registrar pago automático en caja
      try {
        await this.paymentsService.create(
          {
            amount: paymentAmount,
            paymentMethod: 'CASH' as any,
            ticketId: undefined,
            userId: savedSub.userId,
          },
          currentUser,
        );
      } catch (error) {
        console.error('Error al registrar pago automático por nueva suscripción:', error);
      }

      return subscriptionWithRelations;
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error crítico al crear suscripción:', error);
      throw new InternalServerErrorException(
        error?.message || 'Ocurrió un error inesperado al registrar el cliente fijo.'
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

    if (updateDto.parkingSpaceId !== undefined) {
      sub.parkingSpaceId = updateDto.parkingSpaceId ? Number(updateDto.parkingSpaceId) : null;
    }

    Object.assign(sub, updateDto);
    const saved = await this.subscriptionRepository.save(sub);
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

    await this.paymentsService.create(
      {
        amount: paymentAmount,
        paymentMethod: renewDto.paymentMethod || 'CASH',
        ticketId: undefined,
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

  async remove(id: number): Promise<Subscription> {
    const sub = await this.findOne(id);
    return await this.subscriptionRepository.remove(sub);
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