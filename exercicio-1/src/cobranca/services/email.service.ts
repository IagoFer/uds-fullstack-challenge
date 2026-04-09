import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

/**
 * Serviço de envio de e-mails via Resend.
 *
 * O Resend é um serviço moderno de e-mail transacional com API simples
 * e excelente developer experience. Alternativas comuns incluem
 * AWS SES, SendGrid e Mailgun.
 *
 * Configuração necessária:
 * - RESEND_API_KEY: chave de API obtida em https://resend.com
 * - RESEND_FROM_EMAIL: onboarding@resend.dev (é o email de teste do Resend)
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;
  private readonly fromEmail: string;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.fromEmail =
      process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  }

  /**
   * Envia um lembrete de cobrança por e-mail.
   *
   * Em caso de falha na API do Resend, o erro é propagado para o
   * scheduler, que registra a falha e agenda uma nova tentativa.
   */
  async enviarLembrete(
    destinatario: string,
    assunto: string,
    corpo: string,
  ): Promise<void> {
    this.logger.log(`Enviando e-mail para ${destinatario}...`);

    const { data, error } = await this.resend.emails.send({
      from: this.fromEmail,
      to: [destinatario],
      subject: assunto,
      text: corpo,
    });

    if (error) {
      this.logger.error(
        `Falha ao enviar e-mail para ${destinatario}: ${error.message}`,
      );
      throw new Error(`Resend API error: ${error.message}`);
    }

    this.logger.log(
      `✅ E-mail enviado com sucesso para ${destinatario} (ID: ${data?.id})`,
    );
  }
}
