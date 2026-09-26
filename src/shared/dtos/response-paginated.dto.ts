import { ApiResponseProperty } from '@nestjs/swagger';
import { ResponseDto } from './response.dto';
import { PaginationMetaDto } from './pagination-meta.dto';

export class ResponsePaginatedDto<T> extends ResponseDto<T[]> {
  @ApiResponseProperty({
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;

  static fromDataAndMeta<T>(result: {
    data: T[];
    total: number;
    page: number;
    limit: number;
  }): ResponsePaginatedDto<T> {
    const response = new ResponsePaginatedDto<T>();
    response.data = result.data;
    response.meta = {
      total: result.total,
      page: result.page,
      limit: result.limit,
      hasNextPage: result.page * result.limit < result.total,
      hasPreviousPage: result.page > 1,
    };
    return response;
  }
}
