import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
@Injectable()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const context = host.switchToHttp();
    const request = context.getRequest<{ url?: string }>();
    const response = context.getResponse();
    const statusCode =
      exception instanceof HttpException ? exception.getStatus() : 500;
    const message = this.getMessage(exception, statusCode);

    httpAdapter.reply(
      response,
      {
        statusCode,
        message,
        path: request.url ?? '',
      },
      statusCode,
    );
  }

  private getMessage(
    exception: unknown,
    statusCode: number,
  ): string | string[] {
    if (statusCode >= 500) {
      return 'Internal server error';
    }

    if (!(exception instanceof HttpException)) {
      return 'Internal server error';
    }

    const exceptionResponse = exception.getResponse();
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'message' in exceptionResponse
    ) {
      const { message } = exceptionResponse;
      if (typeof message === 'string' || Array.isArray(message)) {
        return message as string | string[];
      }
    }

    return exception.message;
  }
}
