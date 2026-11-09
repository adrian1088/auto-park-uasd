import { PaginationDto } from '../../../shared/dtos/pagination.dto';
import { IntersectionType } from '@nestjs/swagger';

export class FilterUserDto {}

export class FilterUserPaginatedDto extends IntersectionType(
  FilterUserDto,
  PaginationDto,
) {}
