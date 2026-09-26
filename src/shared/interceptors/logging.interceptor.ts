import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const { method, url, body, user } = req;
    const userId = user?.sub || 'anonymous';

    // Log the request
    this.logger.log(
      `[${userId}] ${method} ${url} - Request body: ${JSON.stringify(body)}`,
    );

    const now = Date.now();
    return next.handle().pipe(
      tap((data) => {
        // Log the response
        this.logger.log(
          `[${userId}] ${method} ${url} - ${Date.now() - now}ms - Response: ${
            typeof data === 'object' ? 'Object returned' : data
          }`,
        );
      }),
    );
  }
}
