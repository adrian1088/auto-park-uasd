import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/users.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { Payment } from './entities/payment.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(dto: CreatePaymentDto): Promise<Payment> {
    const user = await this.findUser(dto.userId);
    const payment = this.paymentsRepository.create({
      amount: dto.amount,
      paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
      paymentMethod: dto.paymentMethod,
      user,
      ticket: null,
    });
    return this.toSafePayment(await this.paymentsRepository.save(payment));
  }

  async findAll(): Promise<Payment[]> {
    const payments = await this.paymentsRepository.find({
      relations: { user: true, ticket: true },
      order: { id: 'DESC' },
    });
    return payments.map((payment) => this.toSafePayment(payment));
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

  async update(id: number, dto: UpdatePaymentDto): Promise<Payment> {
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
    if (dto.userId !== undefined) {
      payment.user = await this.findUser(dto.userId);
    }
    if (dto.amount !== undefined) payment.amount = dto.amount;
    if (dto.paymentDate !== undefined) payment.paymentDate = new Date(dto.paymentDate);
    if (dto.paymentMethod !== undefined) payment.paymentMethod = dto.paymentMethod;
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
      throw new ConflictException('No se puede eliminar un pago asociado a un ticket');
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

  private async findUser(id: number): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  private toSafePayment(payment: Payment): Payment {
    if (payment.user) {
      const { password: _password, ...publicUser } = payment.user;
      payment.user = publicUser as User;
    }
    if (payment.ticket?.user) {
      const { password: _password, ...publicUser } = payment.ticket.user;
      payment.ticket.user = publicUser as User;
    }
    return payment;
  }
}
