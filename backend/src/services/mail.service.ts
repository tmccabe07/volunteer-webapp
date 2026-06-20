import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

export interface SendMailOptions {
  to: string[];
  subject: string;
  html: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transport = process.env.EMAIL_TRANSPORT ?? 'console';
  private readonly from = process.env.EMAIL_FROM ?? 'noreply@cubscouts.local';

  async send(options: SendMailOptions): Promise<void> {
    if (this.transport === 'resend') {
      await this.sendViaResend(options);
    } else {
      this.logToConsole(options);
    }
  }

  private async sendViaResend(options: SendMailOptions): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is required when EMAIL_TRANSPORT=resend');
    }
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: this.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }
  }

  private logToConsole(options: SendMailOptions): void {
    this.logger.log(`TO: ${options.to.join(', ')}`);
    this.logger.log(`SUBJECT: ${options.subject}`);
    this.logger.log(`HTML: ${options.html}`);
  }
}
