import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiResponseType } from '../../shared/decorator/api-response-type.decorator';
import { ResponsePaginatedDto } from '../../shared/dtos/response-paginated.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { FilterUserPaginatedDto } from './dto/find-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PublicUser, UsersService } from './users.service';
import { ApiTags } from '@nestjs/swagger';
import { UserDto } from './dto/user.dto';
import { UserSource } from './enums/user-resource.enum';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiResponseType(UserDto, { status: HttpStatus.CREATED })
  create(@Body() createUserDto: CreateUserDto): Promise<PublicUser> {
    return this.usersService.create({
      name: createUserDto.name,
      email: createUserDto.email,
      phone: createUserDto.phone,
      role: createUserDto.role,
      source: UserSource.ADMIN,
    });
  }

  @Get()
  @ApiResponseType(UserDto, { type: 'paginated' })
  findAll(
    @Query() query: FilterUserPaginatedDto,
  ): Promise<ResponsePaginatedDto<PublicUser>> {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @ApiResponseType(UserDto)
  findOne(@Param('id', ParseIntPipe) id: number): Promise<PublicUser> {
    return this.usersService.findOne({ id });
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<PublicUser> {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<PublicUser> {
    return this.usersService.remove(id);
  }
}
