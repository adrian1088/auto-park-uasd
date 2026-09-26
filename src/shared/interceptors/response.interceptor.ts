import {
  CallHandler,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, Observable } from 'rxjs';
import { SKIP_RESPONSE_TRANSFORM_KEY } from '../decorator/skip-response-transform.decorator';
import { ResponseDto } from '../dtos/response.dto';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, unknown> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: Parameters<NestInterceptor<T, unknown>['intercept']>[0],
    next: CallHandler<T>,
  ): Observable<unknown> {
    const skipTransform = this.reflector.getAllAndOverride<boolean>(
      SKIP_RESPONSE_TRANSFORM_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipTransform) {
      return next.handle();
    }

    return next.handle().pipe(
      map((result) => {
        if (result instanceof ResponseDto || result instanceof StreamableFile) {
          return result;
        }

        return { data: result ?? null };
      }),
    );
  }
}
