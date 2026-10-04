import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParkingLot } from './entities/parking-lot.entity';
import { ParkingFloor } from './entities/parking-floor.entity';
import { ParkingSpace } from './entities/parking-space.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { LotsController } from './lots/lots.controller';
import { LotsService } from './lots/lots.service';
import { FloorsController } from './floors/floors.controller';
import { FloorsService } from './floors/floors.service';
import { SpacesController } from './spaces/spaces.controller';
import { SpacesService } from './spaces/spaces.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ParkingLot, ParkingFloor, ParkingSpace, Ticket]),
  ],
  controllers: [LotsController, FloorsController, SpacesController],
  providers: [LotsService, FloorsService, SpacesService],
  exports: [LotsService, FloorsService, SpacesService],
})
export class ParkingModule {}
