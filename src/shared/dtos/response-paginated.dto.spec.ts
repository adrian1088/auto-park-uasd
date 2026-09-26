import { ResponsePaginatedDto } from './response-paginated.dto';

jest.mock('@nestjs/swagger', () => ({
  ApiResponseProperty: () => () => undefined,
}));

describe('ResponsePaginatedDto', () => {
  it('returns data and navigation metadata without success or timestamp', () => {
    const response = ResponsePaginatedDto.fromDataAndMeta({
      data: [{ id: 1 }],
      total: 21,
      page: 1,
      limit: 10,
    });

    expect(response).toEqual({
      data: [{ id: 1 }],
      meta: {
        total: 21,
        page: 1,
        limit: 10,
        hasNextPage: true,
        hasPreviousPage: false,
      },
    });
  });

  it('marks a final page correctly', () => {
    const response = ResponsePaginatedDto.fromDataAndMeta({
      data: [{ id: 21 }],
      total: 21,
      page: 3,
      limit: 10,
    });

    expect(response.meta.hasNextPage).toBe(false);
    expect(response.meta.hasPreviousPage).toBe(true);
  });

  it('handles an empty result set', () => {
    const response = ResponsePaginatedDto.fromDataAndMeta({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
    });

    expect(response.data).toEqual([]);
    expect(response.meta.hasNextPage).toBe(false);
    expect(response.meta.hasPreviousPage).toBe(false);
  });
});
