import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ParkingLot } from '../entities/parking-lot.entity';
import { ParkingSpace } from '../entities/parking-space.entity';
import { LotsService } from './lots.service';

describe('LotsService', () => {
  let service: LotsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LotsService,
        { provide: getRepositoryToken(ParkingLot), useValue: {} },
        { provide: getRepositoryToken(ParkingSpace), useValue: {} },
      ],
    }).compile();

    service = module.get<LotsService>(LotsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
