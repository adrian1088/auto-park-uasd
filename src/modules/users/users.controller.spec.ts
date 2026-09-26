import 'reflect-metadata';

jest.mock('@nestjs/common', () => {
  const decorator = () => () => undefined;
  return {
    Body: decorator,
    Controller: decorator,
    ConflictException: class ConflictException extends Error {},
    Delete: decorator,
    Get: decorator,
    Injectable: () => (target: unknown) => target,
    Param: decorator,
    ParseIntPipe: class ParseIntPipe {},
    Patch: decorator,
    Post: decorator,
    Query: decorator,
    NotFoundException: class NotFoundException extends Error {},
  };
});

jest.mock('@nestjs/swagger', () => ({
  ApiProperty: decorator,
  ApiPropertyOptional: decorator,
  ApiResponseProperty: decorator,
  PartialType: (classRef: new () => object) => classRef,
}));

jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

function decorator() {
  return () => undefined;
}

import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  } as unknown as UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new UsersController(service);
  });

  it('passes pagination parameters to the service', () => {
    const query = { page: 2, limit: 10 };

    controller.findAll(query);

    expect(service.findAll).toHaveBeenCalledWith(query);
  });

  it('routes create, detail, update, and remove operations', () => {
    const createDto = {
      name: 'Ana Pérez',
      email: 'ana@example.com',
      password: 'secret123',
      phone: '809-555-0101',
    };
    const updateDto = { name: 'Ana Gómez' };

    controller.create(createDto);
    controller.findOne(1);
    controller.update(1, updateDto);
    controller.remove(1);

    expect(service.create).toHaveBeenCalledWith(createDto);
    expect(service.findOne).toHaveBeenCalledWith(1);
    expect(service.update).toHaveBeenCalledWith(1, updateDto);
    expect(service.remove).toHaveBeenCalledWith(1);
  });
});
