import { Injectable } from '@nestjs/common';
import { IMailConfig } from '../../config/mail.config';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import fs from 'node:fs/promises';
import path from 'node:path';
import Handlebars from 'handlebars';

@Injectable()
export class MailerService {
  private readonly transporter: Transporter;
  private readonly mailConfig: IMailConfig;

  constructor(private readonly configService: ConfigService) {
    this.mailConfig = this.configService.getOrThrow<IMailConfig>('mail');

    this.transporter = nodemailer.createTransport({
      host: this.mailConfig.host,
      port: this.mailConfig.port,
      auth:
        this.mailConfig.user && this.mailConfig.password
          ? { user: this.mailConfig.user, pass: this.mailConfig.password }
          : undefined,
      ignoreTLS: this.mailConfig.ignoreTls,
      secure: this.mailConfig.secure,
      requireTLS: this.mailConfig.requireTls,
    });
  }

  async sendMail({
    templatePath,
    context,
    ...mailOptions
  }: SendMailOptions & {
    templatePath: string;
    context: Record<string, unknown>;
  }) {
    let html: string | undefined;
    if (templatePath) {
      const template = await fs.readFile(templatePath, 'utf-8');
      html = Handlebars.compile(template, {
        strict: true,
      })(context);
    }

    const logoBase64 = await fs.readFile(
      path.join(__dirname, 'assets', 'logo.png'),
      { encoding: 'base64' },
    );

    await this.transporter.sendMail({
      ...mailOptions,
      from: mailOptions.from
        ? mailOptions.from
        : `"${this.mailConfig.defaultName}" <${this.mailConfig.defaultEmail}>`,
      html: mailOptions.html ? mailOptions.html : html,
      attachments: [
        ...(mailOptions.attachments ?? []),
        {
          filename: 'logo.png',
          content: Buffer.from(logoBase64, 'base64'),
          contentType: 'image/png',
          contentDisposition: 'inline',
          cid: 'autoparkLogo',
        },
      ],
    });
  }
}
