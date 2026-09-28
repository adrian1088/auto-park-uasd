import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from './entities/ticket.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { User } from '../users/entities/users.entity';
import { ParkingSpace } from '../parking/entities/parking-space.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { Rate } from '../rates/entities/rate.entity';
import { Payment } from '../payments/entities/payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Ticket,
      Vehicle,
      User,
      ParkingSpace,
      Reservation,
      Rate,
      Payment,
    ]),
  ],
  controllers: [TicketsController],
  providers: [TicketsService],
})
export class TicketsModule {}
