import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { ParkingLot } from '../parking/entities/parking-lot.entity';
import { Rate } from './entities/rate.entity';
import { RateType } from './enum/rate-type.enum';
import { RatesService } from './rates.service';

describe('RatesService', () => {
  let service: RatesService;
  let rateRepository: Partial<Repository<Rate>>;
  let parkingLotRepository: Partial<Repository<ParkingLot>>;
  let queryBuilder: {
    where: jest.Mock;
    andWhere: jest.Mock;
    getExists: jest.Mock;
  };

  beforeEach(() => {
    queryBuilder = {
      where: jest.fn(),
      andWhere: jest.fn(),
      getExists: jest.fn().mockResolvedValue(false),
    };
    queryBuilder.where.mockReturnValue(queryBuilder);
    queryBuilder.andWhere.mockReturnValue(queryBuilder);

    rateRepository = {
      create: jest.fn((rate: unknown) => rate as Rate),
      createQueryBuilder: jest.fn(() => queryBuilder as never),
      save: jest.fn(async (rate: unknown) => rate as Rate),
    } as unknown as Partial<Repository<Rate>>;
    parkingLotRepository = {
      findOneBy: jest.fn(async (_criteria: unknown) => ({ id: 7 }) as ParkingLot),
    } as unknown as Partial<Repository<ParkingLot>>;
    service = new RatesService(
      rateRepository as unknown as Repository<Rate>,
      parkingLotRepository as unknown as Repository<ParkingLot>,
    );
  });

  it('creates a rate with a normalized decimal amount', async () => {
    const rate = await service.create({
      parkingLotId: 7,
      type: RateType.HOURLY,
      amount: 12.5,
      validFrom: '2026-09-26T00:00:00.000Z',
    });

    expect(rate.amount).toBe('12.50');
    expect(rate.isActive).toBe(true);
    expect(rate.parkingLot.id).toBe(7);
  });

  it('rejects a rate whose validity overlaps an active rate', async () => {
    queryBuilder.getExists.mockResolvedValue(true);

    await expect(
      service.create({
        parkingLotId: 7,
        type: RateType.HOURLY,
        amount: 12.5,
        validFrom: '2026-09-26T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects an end date that is not later than the start date', async () => {
    await expect(
      service.create({
        parkingLotId: 7,
        type: RateType.DAILY,
        amount: 20,
        validFrom: '2026-09-27T00:00:00.000Z',
        validTo: '2026-09-27T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an unknown rate type when resolving the current rate', async () => {
    await expect(service.findCurrent(7, 'WEEKLY' as RateType)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});