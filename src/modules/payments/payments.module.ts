import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { User } from '../users/entities/users.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, User])],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
