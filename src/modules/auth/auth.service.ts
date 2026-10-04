import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from '../users/entities/users.entity';
import { IsNull, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { EncryptService } from '../../shared/encrypt/encrypt.service';
import {
  JwtAccessPayload,
  JwtRefreshPayload,
} from './interfaces/jwt-payload.interface';
import { JwtService } from '@nestjs/jwt';
import ms from 'ms';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/enums/users-role.enum';
import { UserStatus } from '../users/enums/users-status.enum';
import { SignUpDto } from './dto/sign-up.dto';

@Injectable()
export class AuthService {
  private readonly refreshSecret: string;
  private readonly refreshExpiresIn: string;
  private readonly accessSecret: string;
  private readonly accessExpiresIn: string;

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly userService: UsersService,
    private readonly encryptService: EncryptService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.accessSecret = this.configService.getOrThrow('jwt.secret');
    this.accessExpiresIn = this.configService.getOrThrow('jwt.expiresIn');
    this.refreshSecret = this.configService.getOrThrow('jwt.refreshSecret');
    this.refreshExpiresIn = this.configService.getOrThrow(
      'jwt.refreshExpiresIn',
    );
  }

  async signIn(user: User) {
    const accessToken = await this.signAccessToken(user.id);
    const refreshToken = await this.signRefreshToken(user.id);
    //TODO: Eliminar mas adelante
    // const hashedRefresh = await this.encryptService.hash(refreshToken);
    // const expiresAt = new Date(
    //   Date.now() + ms(this.refreshExpiresIn as ms.StringValue),
    // );

    return { accessToken, refreshToken };
  }

  async signUp(user: SignUpDto) {
    const newUser = await this.userService.create({
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      ...user,
    });
    return newUser;
  }

   signOut(userId: number) {
    // TODO: Borrar mas adelante
    // const user = await this.userRepo.findOne({ where: { id: userId } });
    // if (!user) throw new UnauthorizedException('Usuario no autorizado');
    // return { success: true };
  }

  async refreshTokens(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.refreshSecret,
      });
      const userId = payload.sub;
      const user = await this.userRepo.findOne({
        where: { id: userId },
      });

      const { accessToken, refreshToken: newRefresh } = user
        ? await this.signIn(user)
        : { accessToken: '', refreshToken: '' };

      return { accessToken, refreshToken: newRefresh };
    } catch (err: any) {
      throw new UnauthorizedException('Actualización de token no autorizada');
    }
  }

  async findUserAuthById(id: number): Promise<User | null> {
    const user = await this.userRepo.findOne({
      where: { id: id },
    });
    return user;
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', {
        email: email,
      })
      .getOne();

    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    const matches = await this.encryptService.compare(password, user.password);
    if (!matches) throw new UnauthorizedException('Credenciales inválidas');
    return user;
  }

  private async signAccessToken(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuario no autorizado');

    const payload: JwtAccessPayload = {
      sub: userId,
      type: 'access',
      issuer: 'auto-park-uasd', // Optional: replace with your actual issuer
      audience: 'auto-park-uasd-web', // Optional: replace with your actual audience
      iat: Math.floor(Date.now() / 1000), // Current timestamp in seconds
      name: user.name,
      email: user.email,
      role: user.role,
    };
    // const expiresIn = ms(this.accessExpiresIn as ms.StringValue) / 1000; // en segundos
    const token = await this.jwtService.signAsync(payload, {
      secret: this.accessSecret,
      expiresIn: this.accessExpiresIn as ms.StringValue,
    });
    return token;
  }

  private async signRefreshToken(userId: number) {
    // const expiresIn = ms(this.refreshExpiresIn as ms.StringValue) / 1000; // en segundos
    const payload: JwtRefreshPayload = {
      sub: userId,
      type: 'refresh',
      issuer: 'auto-park-uasd', // Optional: replace with your actual issuer
      audience: 'auto-park-uasd-web', // Optional: replace with your actual audience
      iat: Math.floor(Date.now() / 1000), // Current timestamp in seconds
    };
    const token = await this.jwtService.signAsync(payload, {
      secret: this.refreshSecret,
      expiresIn: this.refreshExpiresIn as ms.StringValue,
    });
    return token;
  }
}
