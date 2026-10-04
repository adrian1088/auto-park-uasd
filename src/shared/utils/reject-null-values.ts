import { BadRequestException } from '@nestjs/common';

export function rejectNullValues(
  dto: object,
  nullableFields: string[] = [],
): void {
  const hasInvalidNull = Object.entries(dto).some(
    ([field, value]) => value === null && !nullableFields.includes(field),
  );
  if (hasInvalidNull) {
    throw new BadRequestException(
      'Los campos proporcionados no pueden ser null',
    );
  }
}
