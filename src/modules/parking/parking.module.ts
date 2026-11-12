// src/modules/parking/parking.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParkingFloor } from './entities/parking-floor.entity';
import { ParkingSpace } from './entities/parking-space.entity';
import { TicketEntity } from '../tickets/entities/ticket.entity';
import { SpacesController } from './spaces/spaces.controller';
import { SpacesService } from './spaces/spaces.service';
import { FloorsController } from './floors/floors.controller';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { FloorsService } from './floors/floors.service';
import { LotsController } from './lots/lots.controller';
import { LotsService } from './lots/lots.service';
import { GateController } from './kiosco/gate.controller';
import { GateService } from './kiosco/gate.service';
import { VehicleEntity } from '../vehicles/entities/vehicle.entity';
import { ReservationEntity } from '../reservations/entities/reservation.entity';
import { TicketsModule } from '../tickets/tickets.module';
import { ParkingLot } from './entities/parking-lot.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ParkingSpace,
      ParkingFloor,
      ParkingLot,
      VehicleEntity,
      ReservationEntity,
      TicketEntity,
      Subscription,
    ]),
    TicketsModule,
  ],
  controllers: [
    SpacesController,
    FloorsController,
    LotsController,
    GateController,
  ],
  providers: [SpacesService, FloorsService, LotsService, GateService],
  exports: [SpacesService, GateService],
})
export class ParkingModule {}