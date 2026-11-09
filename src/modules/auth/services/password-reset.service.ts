import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID, createHash } from 'node:crypto';
import { MoreThan } from 'typeorm';
import { MailService } from '../../mail/mail.service';
import { Repository } from 'typeorm';
import { PasswordResetTokenEntity } from '../../tokens/entities/password-reset-token.entity';
import { UserEntity } from '../../users/entities/users.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { UserStatus } from '../../users/enums/users-status.enum';

@Injectable()
export class PasswordResetService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(PasswordResetTokenEntity)
    private readonly passwordResetRepository: Repository<PasswordResetTokenEntity>,
    private readonly mailService: MailService,
  ) {}

  async request(email: string) {
    // 1. Verificar si el usuario existe en la base de datos
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (user.status !== UserStatus.ACTIVE) {
      throw new NotFoundException('Usuario no activo');
    }

    const existingToken = await this.passwordResetRepository.findOne({
      where: { userId: user.id, expiresAt: MoreThan(new Date()) },
    });
    if (existingToken) {
      await this.passwordResetRepository.remove(existingToken);
    }

    // 2. Generar token de restablecimiento de contraseña
    const token = randomUUID();
    const tokenHash = createHash('sha256').update(token).digest('hex');

    // 3. Guardar token de restablecimiento de contraseña en la base de datos
    // TODO: Configurar tiempo de expiración desde la configuración de la aplicación
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas
    const passwordReset = this.passwordResetRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });
    await this.passwordResetRepository.save(passwordReset);

    // 4. Enviar correo electrónico con el token de restablecimiento de contraseña
    await this.mailService.sendTokenResetPasswordEmail({
      to: email,
      data: { hash: token, tokenExpires: expiresAt.getTime() },
    });
  }

  async reset({ token, newPassword }: { token: string; newPassword: string }) {
    // 1. Validar token de restablecimiento de contraseña
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const passwordReset = await this.passwordResetRepository.findOne({
      where: { tokenHash, expiresAt: MoreThan(new Date()) },
    });
    if (!passwordReset) {
      throw new NotFoundException(
        'Token de restablecimiento de contraseña no válido o expirado',
      );
    }
    // 2. Actualizar password del usuario asociado al token
    const user = await this.userRepository.findOne({
      where: { id: passwordReset.userId },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    user.password = newPassword;
    await this.userRepository.save(user);

    // 3. Invalidar token de restablecimiento de contraseña después de usarlo
    await this.passwordResetRepository.remove(passwordReset);
  }
}
