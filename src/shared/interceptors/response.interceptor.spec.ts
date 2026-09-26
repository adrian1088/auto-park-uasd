import { lastValueFrom, of } from 'rxjs';
import { ResponseDto } from '../dtos/response.dto';
import { ResponsePaginatedDto } from '../dtos/response-paginated.dto';
import {
  SKIP_RESPONSE_TRANSFORM_KEY,
  SkipResponseTransform,
} from '../decorator/skip-response-transform.decorator';
import { ResponseInterceptor } from './response.interceptor';

jest.mock('@nestjs/common', () => ({
  Injectable: () => (target: unknown) => target,
  SetMetadata: (key: string, value: unknown) => ({ key, value }),
  StreamableFile: class MockStreamableFile {},
}));

jest.mock('@nestjs/core', () => ({
  Reflector: class MockReflector {},
}));

jest.mock('@nestjs/swagger', () => ({
  ApiResponseProperty: () => () => undefined,
}));

describe('ResponseInterceptor', () => {
  const handler = jest.fn();
  const controller = jest.fn();
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(false),
  };
  const interceptor = new ResponseInterceptor(reflector as never);

  const interceptValue = (value: unknown) =>
    lastValueFrom(
      interceptor.intercept(
        {
          getHandler: () => handler,
          getClass: () => controller,
        } as never,
        { handle: () => of(value) },
      ),
    );

  beforeEach(() => {
    reflector.getAllAndOverride.mockReset().mockReturnValue(false);
  });

  it('wraps regular values in the data property', async () => {
    await expect(interceptValue([{ id: 1 }])).resolves.toEqual({
      data: [{ id: 1 }],
    });
  });

  it('normalizes an undefined result to null data', async () => {
    await expect(interceptValue(undefined)).resolves.toEqual({ data: null });
  });

  it('does not wrap an existing response DTO again', async () => {
    const response = new ResponseDto<number>();
    response.data = 4;

    await expect(interceptValue(response)).resolves.toBe(response);
  });

  it('does not wrap an existing paginated response again', async () => {
    const response = ResponsePaginatedDto.fromDataAndMeta({
      data: [{ id: 1 }],
      total: 1,
      page: 1,
      limit: 10,
    });

    await expect(interceptValue(response)).resolves.toBe(response);
  });

  it('does not wrap a streamable file', async () => {
    const { StreamableFile } = jest.requireMock('@nestjs/common') as {
      StreamableFile: new () => object;
    };
    const file = new StreamableFile();

    await expect(interceptValue(file)).resolves.toBe(file);
  });

  it('does not transform a handler marked with SkipResponseTransform', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const result = { message: 'raw response' };

    await expect(interceptValue(result)).resolves.toBe(result);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      SKIP_RESPONSE_TRANSFORM_KEY,
      [handler, controller],
    );
  });

  it('defines the skip metadata as true', () => {
    expect(SkipResponseTransform()).toEqual({
      key: SKIP_RESPONSE_TRANSFORM_KEY,
      value: true,
    });
  });
});
