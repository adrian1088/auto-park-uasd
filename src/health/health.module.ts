import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthService } from './health.service';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule],
  providers: [HealthService],
  controllers: [HealthController],
})
export class HealthModule {}
