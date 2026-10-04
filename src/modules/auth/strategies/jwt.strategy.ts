import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import { UserStatus } from '../../users/enums/users-status.enum';
import { User } from '../../users/entities/users.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private cookieAuthName: string;
  constructor(
    configService: ConfigService,
    private readonly usersService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          this.cookieAuthName = configService.getOrThrow('jwt.cookieAuthName');
          const token = request?.cookies?.[this.cookieAuthName];
          return token;
        },
      ]),// extrae el token de la cookie 'Authentication'
      secretOrKey: configService.getOrThrow('jwt.secret'),
      ignoreExpiration: false, // falso para que se verifique la expiración del token
      passReqToCallback: true, // necesario para pasar la solicitud a la función validate
    });
  }

  async validate(
    req: Request,
    payload: any,
  ): Promise<User> {
    const token = req.cookies?.[this.cookieAuthName];
    if (!token) {
      throw new UnauthorizedException('Token de autenticación faltante');
    }
    const user: User | null = await this.usersService.findUserAuthById(payload.sub);
    const userStatus = user?.status as UserStatus;
    if (!user || userStatus === UserStatus.INACTIVE) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return user;
  }
}
