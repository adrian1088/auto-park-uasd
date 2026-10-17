import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Ticket } from '../../tickets/entities/ticket.entity';
import { ParkingSpace } from '../entities/parking-space.entity';
import { FloorsService } from '../floors/floors.service';
import { LotsService } from '../lots/lots.service';
import { SpacesService } from './spaces.service';

describe('SpacesService', () => {
  let service: SpacesService;
  let spacesRepository: { findAndCount: jest.Mock };

  beforeEach(async () => {
    spacesRepository = { findAndCount: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpacesService,
        {
          provide: getRepositoryToken(ParkingSpace),
          useValue: spacesRepository,
        },
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

  it('filters paginated spaces by lot and floor', async () => {
    spacesRepository.findAndCount.mockResolvedValue([[], 0]);

    await service.findSpacesPaginated({
      lotId: 3,
      floorId: 7,
      page: 2,
      limit: 5,
    });

    expect(spacesRepository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { floor: { id: 7, lot: { id: 3 } } },
        skip: 5,
        take: 5,
      }),
    );
  });
});
