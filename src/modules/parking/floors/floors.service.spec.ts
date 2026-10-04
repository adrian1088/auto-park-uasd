import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ParkingFloor } from '../entities/parking-floor.entity';
import { ParkingSpace } from '../entities/parking-space.entity';
import { LotsService } from '../lots/lots.service';
import { FloorsService } from './floors.service';

describe('FloorsService', () => {
  let service: FloorsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FloorsService,
        { provide: getRepositoryToken(ParkingFloor), useValue: {} },
        { provide: getRepositoryToken(ParkingSpace), useValue: {} },
        { provide: LotsService, useValue: {} },
      ],
    }).compile();

    service = module.get<FloorsService>(FloorsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
