import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { UsersService } from '../users/users.service';
import { TicketsService } from '../tickets/tickets.service';
import { BadRequestException } from '@nestjs/common';
import { PaymentMethod } from './enum/payment-method.enum';

describe('PaymentsService', () => {
  let service: PaymentsService;
  const paymentRepository = {
    create: jest.fn((payment) => payment),
    save: jest.fn((payment) => Promise.resolve({ ...payment, id: 1 })),
  };
  const usersService = {
    findOne: jest.fn().mockResolvedValue({ id: 1 }),
  };
  const ticketsService = {
    checkoutQuote: jest.fn().mockResolvedValue({ amount: '100.00' }),
    findOne: jest.fn().mockResolvedValue({ id: 2, payment: null }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getRepositoryToken(Payment), useValue: paymentRepository },
        { provide: UsersService, useValue: usersService },
        { provide: TicketsService, useValue: ticketsService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it.each([50, 150])(
    'rejects a payment that does not match the ticket total (%s)',
    async (amount) => {
      await expect(
        service.create(
          { ticketId: 2, amount, paymentMethod: PaymentMethod.CASH },
          { id: 1, name: 'Test User' },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(paymentRepository.save).not.toHaveBeenCalled();
    },
  );

  it('creates a payment for the full ticket total', async () => {
    const result = await service.create(
      { ticketId: 2, amount: 100, paymentMethod: PaymentMethod.CASH },
      { id: 1, name: 'Test User' },
    );

    expect(result.amount).toBe(100);
    expect(paymentRepository.save).toHaveBeenCalledTimes(1);
  });
});
