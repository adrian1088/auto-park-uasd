import { Injectable } from '@nestjs/common';
import { IMailConfig } from '../../config/mail.config';
import { ConfigService } from '@nestjs/config';
import  nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import fs from 'node:fs/promises';
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

    await this.transporter.sendMail({
      ...mailOptions,
      from: mailOptions.from
        ? mailOptions.from
        : `"${this.mailConfig.defaultName}" <${this.mailConfig.defaultEmail}>`,
      html: mailOptions.html ? mailOptions.html : html,
    });
  }
}
