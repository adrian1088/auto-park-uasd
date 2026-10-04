jest.mock('@nestjs/common', () => {
  class MockConflictException extends Error {}
  class MockNotFoundException extends Error {}
  return {
    ConflictException: MockConflictException,
    Injectable: () => (target: unknown) => target,
    NotFoundException: MockNotFoundException,
  };
});

jest.mock('@nestjs/swagger', () => ({
  ApiResponseProperty: () => () => undefined,
}));

jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from './entities/users.entity';
import { UserRole } from './enums/users-role.enum';
import { UserStatus } from './enums/users-status.enum';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let repository: Partial<Repository<User>>;
  const user = {
    id: 1,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    name: 'Ana Pérez',
    email: 'ana@example.com',
    password: 'secret123',
    phone: '809-555-0101',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
  } as User;

  beforeEach(() => {
    repository = {
      create: jest.fn((data: User) => data),
      save: jest.fn(async (data: User) => data),
      findOneBy: jest.fn().mockResolvedValue(null),
      findOne: jest.fn().mockResolvedValue(user),
      findAndCount: jest.fn().mockResolvedValue([[user], 21]),
    } as unknown as Partial<Repository<User>>;
    service = new UsersService(repository as Repository<User>);
  });

  it('creates a user without returning the password', async () => {
    const result = await service.create({
      name: user.name,
      email: user.email,
      password: user.password,
      phone: user.phone,
    });

    expect(repository.save).toHaveBeenCalled();
    expect(result).not.toHaveProperty('password');
    expect(result.email).toBe(user.email);
  });

  it('rejects a duplicated email', async () => {
    (repository.findOneBy as jest.Mock).mockResolvedValue(user);

    await expect(
      service.create({
        name: user.name,
        email: user.email,
        password: user.password,
        phone: user.phone,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns paginated users and metadata', async () => {
    const result = await service.findAll({ page: 2, limit: 10 });

    expect(repository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10, order: { id: 'DESC' } }),
    );
    expect(result.meta).toEqual({
      total: 21,
      page: 2,
      limit: 10,
      hasNextPage: true,
      hasPreviousPage: true,
    });
    expect(result.data[0]).not.toHaveProperty('password');
  });

  it('rejects an unknown user', async () => {
    (repository.findOne as jest.Mock).mockResolvedValue(null);

    await expect(service.findOne(99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deactivates a user instead of deleting it', async () => {
    (repository.findOneBy as jest.Mock).mockResolvedValueOnce(user);
    const result = await service.remove(user.id);

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: UserStatus.INACTIVE }),
    );
    expect(result).not.toHaveProperty('password');
  });
});
