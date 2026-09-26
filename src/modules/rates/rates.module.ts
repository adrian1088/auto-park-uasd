import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParkingLot } from '../parking/entities/parking-lot.entity';
import { Rate } from './entities/rate.entity';
import { RatesController } from './rates.controller';
import { RatesService } from './rates.service';

@Module({
  imports: [TypeOrmModule.forFeature([Rate, ParkingLot])],
  controllers: [RatesController],
  providers: [RatesService],
  exports: [RatesService],
})
export class RatesModule {}