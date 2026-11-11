import {
  BadRequestException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { Subscription } from './entities/subscription.entity';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { FilterSubscriptionPaginatedDto } from './dto/subscription.dto';
import { SubscriptionStatus } from './enum/subscription-status.enum';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class SubscriptionsService {
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    private readonly paymentsService: PaymentsService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.gmail.com',
      port: Number(process.env.MAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
  }

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

      // Enviar correo electrónico con QR 
      if (subscriptionWithRelations.user?.email) {
        try {
          const spaceNumber = subscriptionWithRelations.parkingSpace?.spaceNumber || 'Asignado 24/7';
          await this.sendSubscriptionEmail(
            subscriptionWithRelations.user.email,
            subscriptionWithRelations.user.name,
            spaceNumber,
            qrCodeToken,
            subscriptionWithRelations.startDate,
            subscriptionWithRelations.endDate,
          );
          subscriptionWithRelations.emailSent = true;
          await this.subscriptionRepository.save(subscriptionWithRelations);
        } catch (mailError) {
          console.error('Error al enviar el correo de suscripción con el QR:', mailError);
        }
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

 private async sendSubscriptionEmail(
    email: string,
    name: string,
    spaceNumber: string,
    qrCode: string,
    startDate: Date,
    endDate: Date,
  ) {
    const qrImageUrl = `https://quickchart.io/qr?text=${encodeURIComponent(qrCode)}&size=200&margin=2`;

    const mailOptions = {
      from: process.env.MAIL_FROM || '"AutoPark UASD" <autoparkuasd@gmail.com>',
      to: email,
      subject: '¡Tu espacio exclusivo 24/7 y Código QR - AutoPark UASD!',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0284c7; text-align: center;">¡Bienvenido al sistema de Abonados, ${name}!</h2>
          <p>Tu suscripción de estacionamiento en la <strong>UASD</strong> ha sido procesada con éxito.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px; margin-bottom: 16px; text-align: center;">
            <span style="font-size: 14px; color: #166534;">Espacio Asignado (24/7):</span><br/>
            <strong style="font-size: 22px; color: #15803d;">Espacio #${spaceNumber}</strong>
          </div>

          <p><strong>Periodo de Vigencia:</strong> ${new Date(startDate).toLocaleDateString()} al ${new Date(endDate).toLocaleDateString()}</p>
          
          <div style="text-align: center; margin: 25px 0;">
            <p style="margin-bottom: 10px;"><strong>Tu Código QR de Acceso:</strong></p>
            <img src="${qrImageUrl}" alt="Código QR de Acceso" style="width: 180px; height: 180px; border: 4px solid #f1f5f9; border-radius: 8px;" />
          </div>
          
          <p style="margin-top: 25px; font-size: 13px; color: #64748b; text-align: center;">
            Dirígete a tu espacio asignado al ingresar. Puedes acceder mediante lectura de placa LPR o mostrando este código QR en las entradas.
          </p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }
}