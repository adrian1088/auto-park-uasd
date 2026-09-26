import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckResult, HealthCheckService, HealthIndicatorResult, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/app-config.type';
import { Public } from '../shared/decorator/public.decorator';
import { SkipResponseTransform } from '../shared/decorator/skip-response-transform.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly database: TypeOrmHealthIndicator,
    private readonly configService: ConfigService,
  ) {}

  @Get('liveness')
  @Public()
  @SkipResponseTransform()
  @HealthCheck()
  async check(): Promise<HealthCheckResult> {
    const appName = this.configService.getOrThrow<AppConfig>('app').name;
    return this.healthCheckService.check([
      async (): Promise<HealthIndicatorResult> => ({
        [appName]: { status: 'up' },
      }),
    ]);
  }

  @Get('readiness')
  @Public()
  @SkipResponseTransform()
  @HealthCheck()
  async checkReadiness(): Promise<HealthCheckResult> {
    return this.healthCheckService.check([
      async (): Promise<HealthIndicatorResult> =>
        this.database.pingCheck('postgres'),
    ]);
  }
}
