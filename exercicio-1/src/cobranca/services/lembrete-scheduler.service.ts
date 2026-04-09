import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LembreteService } from './lembrete.service';
import { EmailService } from './email.service';
import { StatusFatura } from '../enums';

const MAX_TENTATIVAS = 3;

/**
 * Serviço agendador que processa lembretes no momento correto.
 *
 * Utiliza @nestjs/schedule com um cron job que roda a cada minuto.
 * A cada execução, busca todos os lembretes com status 'pendente' e
 * data_envio <= agora, e tenta enviá-los.
 *
 * Estratégia de resiliência:
 * - Se o job cai durante o processamento, os lembretes permanecem
 *   com status 'pendente' e serão reprocessados na próxima execução.
 * - Cada lembrete tem um contador de tentativas com limite (MAX_TENTATIVAS).
 *   Após esgotar as tentativas, o status muda para 'falhou' e o lembrete
 *   não é mais processado.
 * - O envio é idempotente: verificamos o status antes de processar,
 *   e usamos update atômico para alterar o status.
 * - Um flag `isRunning` previne execuções concorrentes do mesmo job
 *   no caso de uma execução demorar mais que o intervalo do cron.
 */
@Injectable()
export class LembreteSchedulerService {
  private readonly logger = new Logger(LembreteSchedulerService.name);
  private isRunning = false;

  constructor(
    private readonly lembreteService: LembreteService,
    private readonly emailService: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async processarLembretesPendentes(): Promise<void> {
    // Guard contra execuções concorrentes no mesmo processo
    if (this.isRunning) {
      this.logger.warn('Job anterior ainda em execução, pulando esta rodada.');
      return;
    }

    this.isRunning = true;

    try {
      const lembretes = await this.lembreteService.buscarLembretesProntos();

      if (lembretes.length === 0) {
        this.logger.debug('Nenhum lembrete pendente para processar.');
        return;
      }

      this.logger.log(`Processando ${lembretes.length} lembrete(s) pendente(s)...`);

      for (const lembrete of lembretes) {
        await this.processarLembrete(lembrete);
      }

      this.logger.log('Processamento de lembretes concluído.');
    } catch (error) {
      this.logger.error(
        'Erro inesperado no job de processamento de lembretes',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Processa um lembrete individual.
   *
   * O tratamento de erro é por lembrete (não por lote), então
   * uma falha em um lembrete não impede o processamento dos demais.
   */
  private async processarLembrete(lembrete: {
    id: string;
    tipo: string;
    tentativas: number;
    fatura: {
      id: string;
      descricao: string;
      valor: number;
      dataVencimento: string;
      devedorNome: string;
      devedorEmail: string;
      status: StatusFatura;
    };
  }): Promise<void> {
    const { fatura } = lembrete;

    // Se a fatura já foi paga ou cancelada, não faz sentido enviar lembrete
    if (
      fatura.status === StatusFatura.PAGA ||
      fatura.status === StatusFatura.CANCELADA
    ) {
      this.logger.log(
        `Lembrete ${lembrete.id} ignorado: fatura ${fatura.id} está ${fatura.status}.`,
      );
      await this.lembreteService.marcarComoEnviado(lembrete.id);
      return;
    }

    const tentativaAtual = lembrete.tentativas + 1;

    try {
      const assunto = this.montarAssunto(lembrete.tipo, fatura.descricao);
      const corpo = this.montarCorpo(
        fatura.devedorNome,
        fatura.descricao,
        fatura.valor,
        fatura.dataVencimento,
        lembrete.tipo,
      );

      await this.emailService.enviarLembrete(
        fatura.devedorEmail,
        assunto,
        corpo,
      );

      await this.lembreteService.marcarComoEnviado(lembrete.id);

      this.logger.log(
        `✅ Lembrete ${lembrete.tipo} enviado com sucesso para ${fatura.devedorEmail} (fatura: ${fatura.id})`,
      );
    } catch (error) {
      const mensagemErro =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        `❌ Falha ao enviar lembrete ${lembrete.id} (tentativa ${tentativaAtual}/${MAX_TENTATIVAS}): ${mensagemErro}`,
      );

      if (tentativaAtual >= MAX_TENTATIVAS) {
        await this.lembreteService.marcarComoFalhou(
          lembrete.id,
          `Falha após ${MAX_TENTATIVAS} tentativas. Último erro: ${mensagemErro}`,
          tentativaAtual,
        );
        this.logger.warn(
          `Lembrete ${lembrete.id} marcado como FALHOU após ${MAX_TENTATIVAS} tentativas.`,
        );
      } else {
        // Mantém como pendente para retry na próxima execução
        await this.lembreteService.incrementarTentativa(
          lembrete.id,
          tentativaAtual,
          mensagemErro,
        );
        this.logger.log(
          `Lembrete ${lembrete.id} será tentado novamente na próxima execução.`,
        );
      }
    }
  }

  private montarAssunto(tipo: string, descricaoFatura: string): string {
    const prefixos: Record<string, string> = {
      'D-3': '⏳ Lembrete: sua fatura vence em 3 dias',
      'D+1': '⚠️ Fatura vencida há 1 dia',
      'D+7': '🚨 Fatura vencida há 7 dias — ação necessária',
    };

    return `${prefixos[tipo] || 'Lembrete de fatura'} — ${descricaoFatura}`;
  }

  private montarCorpo(
    nome: string,
    descricao: string,
    valor: number,
    vencimento: string,
    tipo: string,
  ): string {
    const valorFormatado = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);

    const mensagens: Record<string, string> = {
      'D-3':
        `Olá ${nome}, este é um lembrete de que sua fatura "${descricao}" ` +
        `no valor de ${valorFormatado} vence em ${vencimento}. ` +
        `Realize o pagamento até a data para evitar encargos.`,
      'D+1':
        `Olá ${nome}, a fatura "${descricao}" no valor de ${valorFormatado} ` +
        `venceu ontem (${vencimento}). Por favor, regularize o pagamento o mais breve possível.`,
      'D+7':
        `Olá ${nome}, a fatura "${descricao}" no valor de ${valorFormatado} ` +
        `está vencida há 7 dias (vencimento: ${vencimento}). ` +
        `Entre em contato conosco para negociar condições de pagamento.`,
    };

    return mensagens[tipo] || `Lembrete referente à fatura "${descricao}".`;
  }
}
