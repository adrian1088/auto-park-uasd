import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TicketsService } from '../tickets/tickets.service';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { UserEntity } from '../users/entities/users.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { Payment } from './entities/payment.entity';
import { FilterPaymentDto, FilterPaymentPaginatedDto } from './dto/payment.dto';
import { CurrentUserType } from '../../shared/decorator/current-user.decorator';
import { PublicUser, UsersService } from '../users/users.service';

export interface CreateSubscriptionPaymentInput {
  amount: number;
  paymentMethod: any;
  userId?: number;
  paymentDate?: Date | string;
}

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    private readonly usersService: UsersService,
    private readonly ticketsService: TicketsService,
  ) {}

  async create(
    dto: CreatePaymentDto & { userId?: number },
    currentUser?: CurrentUserType,
  ): Promise<Payment> {
    const quote = await this.ticketsService.checkoutQuote(dto.ticketId);
    const paymentCents = Math.round(dto.amount * 100);
    const totalCents = Math.round(Number(quote.amount) * 100);
    if (paymentCents !== totalCents) {
      throw new BadRequestException(
        `El pago debe cubrir el importe total del ticket (${quote.amount}); no se permiten pagos parciales ni sobrepagos`,
      );
    }

    const ticket = await this.ticketsService.findOne(dto.ticketId);
    if (ticket.payment) {
      throw new ConflictException('El ticket ya tiene un pago registrado');
    }

    const targetUserId = dto.userId ?? currentUser?.id;
    let user: PublicUser | undefined;
    if (targetUserId !== undefined && targetUserId !== null) {
      user = await this.findUser(Number(targetUserId));
    }

    const payment = this.paymentsRepository.create({
      amount: dto.amount,
      paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
      paymentMethod: dto.paymentMethod,
      ...(user ? { user: user as any } : {}),
      ticket: { id: Number(dto.ticketId) } as any,
    });

    const savedPayment = await this.paymentsRepository.save(payment);

    // Asegura que ticket_id quede guardado en la columna si la relación no la pobló
    await this.paymentsRepository
      .createQueryBuilder()
      .update(Payment)
      .set({ ticket: { id: Number(dto.ticketId) } as any })
      .where('id = :id', { id: savedPayment.id })
      .execute();

    return this.findOne(savedPayment.id);
  }

  // Registra el pago de creación o renovación de una suscripción sin depender de un ticket
  async createSubscriptionPayment(
    input: CreateSubscriptionPaymentInput,
    currentUser?: CurrentUserType,
  ): Promise<Payment> {
    const numericAmount = Number(input.amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      throw new BadRequestException(
        'El monto del pago de suscripción debe ser mayor que 0.',
      );
    }

    const targetUserId = input.userId ?? currentUser?.id;
    let user: PublicUser | undefined;
    if (targetUserId !== undefined && targetUserId !== null) {
      user = await this.findUser(Number(targetUserId));
    }

    const payment = this.paymentsRepository.create({
      amount: numericAmount,
      paymentDate: input.paymentDate ? new Date(input.paymentDate) : new Date(),
      paymentMethod: input.paymentMethod || ('CASH' as any),
      ...(user ? { user: user as any } : {}),
    });

    const savedPayment = await this.paymentsRepository.save(payment);
    return this.findOne(savedPayment.id);
  }

  async findAll(filter: FilterPaymentDto): Promise<Payment[]> {
    const where: FindOptionsWhere<Payment> = {};
    if (filter.ticketId !== undefined) where.ticket = { id: filter.ticketId };
    if (filter.date !== undefined) where.paymentDate = filter.date;
    if (filter.method !== undefined) where.paymentMethod = filter.method;

    const payments = await this.paymentsRepository.find({
      where,
      relations: { user: true, ticket: true },
      order: { id: 'DESC' },
    });
    return payments.map((payment) => this.toSafePayment(payment));
  }

  async findPaymentPaginated(
    filter: FilterPaymentPaginatedDto,
  ): Promise<{ data: Payment[]; total: number }> {
    const page = filter.page || 1;
    const limit = filter.limit || 10;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Payment> = {};
    if (filter.ticketId !== undefined) where.ticket = { id: filter.ticketId };
    if (filter.date !== undefined) where.paymentDate = filter.date;
    if (filter.method !== undefined) where.paymentMethod = filter.method;

    const [data, total] = await this.paymentsRepository.findAndCount({
      where,
      relations: { user: true, ticket: true },
      order: { id: 'DESC' },
      skip,
      take: limit,
    });
    return {
      data: data.map((payment) => this.toSafePayment(payment)),
      total,
    };
  }

  async findOne(id: number): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { id },
      relations: { user: true, ticket: true },
    });
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }
    return this.toSafePayment(payment);
  }

  async update(
    id: number,
    dto: UpdatePaymentDto,
    currentUser?: CurrentUserType,
  ): Promise<Payment> {
    if (
      Object.entries(dto).some(
        ([field, value]) => value === null && field !== 'ticketId',
      )
    ) {
      throw new BadRequestException('Los campos del pago no pueden ser null');
    }
    const payment = await this.findEntity(id);
    if (payment.ticket) {
      throw new ConflictException(
        'No se puede modificar un pago asociado a un ticket; el check-out lo administra',
      );
    }
    if (currentUser && currentUser.id !== undefined) {
      try {
        payment.user = (await this.findUser(currentUser.id)) as any;
      } catch {
        // Mantiene usuario anterior si falla
      }
    }
    if (dto.amount !== undefined) payment.amount = dto.amount;
    if (dto.paymentDate !== undefined)
      payment.paymentDate = new Date(dto.paymentDate);
    if (dto.paymentMethod !== undefined)
      payment.paymentMethod = dto.paymentMethod;
    if ((dto as any).ticketId !== undefined) {
      payment.ticket = (dto as any).ticketId
        ? ({ id: Number((dto as any).ticketId) } as any)
        : (null as any);
    }

    const saved = await this.paymentsRepository.save(payment);
    return this.findOne(saved.id);
  }

  async remove(id: number): Promise<void> {
    const payment = await this.paymentsRepository.findOne({
      where: { id },
      relations: { ticket: true },
    });
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }
    if (payment.ticket) {
      throw new ConflictException(
        'No se puede eliminar un pago asociado a un ticket',
      );
    }
    await this.paymentsRepository.remove(payment);
  }

  private async findEntity(id: number): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { id },
      relations: { user: true, ticket: true },
    });
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }
    return payment;
  }

  private async findUser(id: number): Promise<PublicUser> {
    const user = await this.usersService.findOne({ id });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  private toSafePayment(payment: Payment): Payment {
    if (payment.user) {
      const { password: _password, ...publicUser } = payment.user;
      payment.user = publicUser as UserEntity;
    }
    if (payment.ticket?.user) {
      const { password: _password, ...publicUser } = payment.ticket.user;
      payment.ticket.user = publicUser as UserEntity;
    }
    return payment;
  }
}