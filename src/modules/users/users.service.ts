import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResponsePaginatedDto } from '../../shared/dtos/response-paginated.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { FindUsersDto } from './dto/find-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/users.entity';
import { UsersStatus } from './enums/users-status.enum';

export type PublicUser = Omit<User, 'password'>;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<PublicUser> {
    await this.ensureEmailAvailable(createUserDto.email);
    const user = this.repo.create(createUserDto);
    const savedUser = await this.repo.save(user);
    return this.toPublicUser(savedUser);
  }

  async findAll({
    page,
    limit,
  }: FindUsersDto): Promise<ResponsePaginatedDto<PublicUser>> {
    const [users, total] = await this.repo.findAndCount({
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        name: true,
        email: true,
        role: true,
        status: true,
        phone: true,
      },
      order: { id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return ResponsePaginatedDto.fromDataAndMeta({
      data: users.map((user) => this.toPublicUser(user)),
      total,
      page,
      limit,
    });
  }

  async findOne(id: number): Promise<PublicUser> {
    const user = await this.repo.findOne({
      where: { id },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        name: true,
        email: true,
        role: true,
        status: true,
        phone: true,
      },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return this.toPublicUser(user);
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<PublicUser> {
    const user = await this.findEntity(id);
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      await this.ensureEmailAvailable(updateUserDto.email, id);
    }
    Object.assign(user, updateUserDto);
    const savedUser = await this.repo.save(user);
    return this.toPublicUser(savedUser);
  }

  async remove(id: number): Promise<PublicUser> {
    const user = await this.findEntity(id);
    user.status = UsersStatus.INACTIVE;
    const savedUser = await this.repo.save(user);
    return this.toPublicUser(savedUser);
  }

  private async findEntity(id: number): Promise<User> {
    const user = await this.repo.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  private async ensureEmailAvailable(
    email: string,
    excludedId?: number,
  ): Promise<void> {
    const existingUser = await this.repo.findOneBy({ email });
    if (existingUser && existingUser.id !== excludedId) {
      throw new ConflictException('El email ya está registrado');
    }
  }

  private toPublicUser(user: User): PublicUser {
    const { password: _password, ...publicUser } = user;
    return publicUser;
  }
}
