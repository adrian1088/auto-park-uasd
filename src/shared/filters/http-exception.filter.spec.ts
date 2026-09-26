import { HttpExceptionFilter } from './http-exception.filter';

jest.mock('@nestjs/common', () => {
  class MockHttpException extends Error {
    constructor(
      private readonly response: string | Record<string, unknown>,
      private readonly status: number,
    ) {
      super(
        typeof response === 'string'
          ? response
          : String(response.message ?? 'Http exception'),
      );
    }

    getResponse() {
      return this.response;
    }

    getStatus() {
      return this.status;
    }
  }

  return {
    Catch: () => (target: unknown) => target,
    HttpException: MockHttpException,
    Injectable: () => (target: unknown) => target,
  };
});

jest.mock('@nestjs/core', () => ({
  HttpAdapterHost: class MockHttpAdapterHost {},
}));

describe('HttpExceptionFilter', () => {
  const response = {};
  const reply = jest.fn();
  const filter = new HttpExceptionFilter({
    httpAdapter: { reply },
  } as never);

  const createHost = (url = '/rates') =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ url }),
        getResponse: () => response,
      }),
    }) as never;

  beforeEach(() => reply.mockClear());

  it('preserves a client error message and status', () => {
    const { HttpException } = jest.requireMock('@nestjs/common') as {
      HttpException: new (
        response: string | Record<string, unknown>,
        status: number,
      ) => Error;
    };

    filter.catch(new HttpException('Invalid input', 400), createHost());

    expect(reply).toHaveBeenCalledWith(
      response,
      { statusCode: 400, message: 'Invalid input', path: '/rates' },
      400,
    );
  });

  it('preserves validation messages returned as an array', () => {
    const { HttpException } = jest.requireMock('@nestjs/common') as {
      HttpException: new (
        response: string | Record<string, unknown>,
        status: number,
      ) => Error;
    };
    const messages = ['name must not be empty', 'email must be valid'];

    filter.catch(
      new HttpException({ message: messages, statusCode: 400 }, 400),
      createHost('/users'),
    );

    expect(reply).toHaveBeenCalledWith(
      response,
      { statusCode: 400, message: messages, path: '/users' },
      400,
    );
  });

  it('hides internal messages for unexpected errors', () => {
    filter.catch(new Error('database credentials leaked'), createHost());

    expect(reply).toHaveBeenCalledWith(
      response,
      {
        statusCode: 500,
        message: 'Internal server error',
        path: '/rates',
      },
      500,
    );
  });

  it('hides details from HTTP 5xx exceptions', () => {
    const { HttpException } = jest.requireMock('@nestjs/common') as {
      HttpException: new (
        response: string | Record<string, unknown>,
        status: number,
      ) => Error;
    };

    filter.catch(
      new HttpException('Internal implementation detail', 503),
      createHost(),
    );

    expect(reply).toHaveBeenCalledWith(
      response,
      {
        statusCode: 503,
        message: 'Internal server error',
        path: '/rates',
      },
      503,
    );
  });
});
