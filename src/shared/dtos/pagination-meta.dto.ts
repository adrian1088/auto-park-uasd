import { ApiResponseProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiResponseProperty({
    type: Number,
    example: 1,
  })
  page: number;

  @ApiResponseProperty({
    type: Number,
    example: 10,
  })
  limit: number;

  @ApiResponseProperty({
    type: Number,
    example: 100,
  })
  total: number;

  @ApiResponseProperty({
    type: Boolean,
    example: true,
  })
  hasNextPage: boolean;

  @ApiResponseProperty({
    type: Boolean,
    example: false,
  })
  hasPreviousPage: boolean;
}
