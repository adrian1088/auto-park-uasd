import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckInService } from './check-in.service';
import { CheckOutService } from './check-out.service';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { TicketEntity } from './entities/ticket.entity';
import { VehicleEntity } from '../vehicles/entities/vehicle.entity';
import { UserEntity } from '../users/entities/users.entity';
import { ParkingFloor } from '../parking/entities/parking-floor.entity';
import { ParkingSpace } from '../parking/entities/parking-space.entity';
import { ReservationEntity } from '../reservations/entities/reservation.entity';
import { RateEntity } from '../rates/entities/rate.entity';
import { Payment } from '../payments/entities/payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TicketEntity,
      VehicleEntity,
      UserEntity,
      ParkingFloor,
      ParkingSpace,
      ReservationEntity,
      RateEntity,
      Payment,
    ]),
  ],
  controllers: [TicketsController],
  providers: [TicketsService, CheckInService, CheckOutService],
  exports: [TicketsService, CheckInService, CheckOutService],
})
export class TicketsModule {}