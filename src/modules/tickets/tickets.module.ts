import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketEntity } from './entities/ticket.entity';
import { VehicleEntity } from '../vehicles/entities/vehicle.entity';
import { UserEntity } from '../users/entities/users.entity';
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
      ParkingSpace,
      ReservationEntity,
      RateEntity,
      Payment,
    ]),
  ],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
