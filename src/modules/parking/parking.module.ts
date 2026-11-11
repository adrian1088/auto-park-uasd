// src/modules/parking/parking.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParkingSpace } from './entities/parking-space.entity';
import { ParkingFloor } from './entities/parking-floor.entity';
import { ParkingLot } from './entities/parking-lot.entity';
import { SpacesController } from './spaces/spaces.controller';
import { SpacesService } from './spaces/spaces.service';
import { FloorsController } from './floors/floors.controller';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { FloorsService } from './floors/floors.service';
import { LotsController } from './lots/lots.controller';
import { LotsService } from './lots/lots.service';
import { GateController } from './kiosco/gate.controller';
import { GateService } from './kiosco/gate.service';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketsModule } from '../tickets/tickets.module'; // <-- Importante para el GateService

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ParkingSpace,
      ParkingFloor, 
      ParkingLot,   // <-- Añadido por seguridad para LotsService
      Vehicle,
      Reservation,
      Ticket,
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
  providers: [
    SpacesService,
    FloorsService,
    LotsService,
    GateService,
  ],
  exports: [SpacesService, GateService],
})
export class ParkingModule {}