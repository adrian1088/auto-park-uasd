import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import {
  isAuthenticationRoute,
  sanitizeSensitiveData,
} from '../utils/sanitize-sensitive-data';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const { method, body, user } = req;
    const url: string = req.path || req.route?.path || req.url?.split('?')[0];
    const userId = user?.sub || 'anonymous';
    const requestBody = isAuthenticationRoute(url)
      ? '[REDACTED]'
      : JSON.stringify(sanitizeSensitiveData(body));

    this.logger.log(
      `[${userId}] ${method} ${url} - Request body: ${requestBody}`,
    );

    const now = Date.now();
    return next.handle().pipe(
      tap((data) => {
        this.logger.log(
          `[${userId}] ${method} ${url} - ${Date.now() - now}ms - Response: ${
            typeof data === 'object' ? 'Object returned' : data
          }`,
        );
      }),
    );
  }
}
