import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Ticket } from '../../tickets/entities/ticket.entity';
import { ParkingSpace } from '../entities/parking-space.entity';
import { FloorsService } from '../floors/floors.service';
import { LotsService } from '../lots/lots.service';
import { SpacesService } from './spaces.service';

describe('SpacesService', () => {
  let service: SpacesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpacesService,
        { provide: getRepositoryToken(ParkingSpace), useValue: {} },
        { provide: getRepositoryToken(Ticket), useValue: {} },
        { provide: FloorsService, useValue: {} },
        { provide: LotsService, useValue: {} },
      ],
    }).compile();

    service = module.get<SpacesService>(SpacesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
