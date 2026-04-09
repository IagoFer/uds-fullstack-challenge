import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { LembreteAgendado } from '../entities/lembrete-agendado.entity';
import { StatusLembrete, TipoLembrete } from '../enums';

/**
 * Serviço responsável pela criação e consulta de lembretes agendados.
 *
 * A lógica de cálculo das datas D-3, D+1, D+7 é centralizada aqui
 * para manter o FaturaService focado na criação da fatura.
 */
@Injectable()
export class LembreteService {
  private readonly logger = new Logger(LembreteService.name);

  constructor(
    @InjectRepository(LembreteAgendado)
    private readonly lembreteRepo: Repository<LembreteAgendado>,
  ) {}

  /**
   * Cria os 3 lembretes da régua de cobrança para uma fatura.
   *
   * O cálculo das datas usa o timezone UTC para consistência.
   * Em produção, seria importante considerar o timezone do devedor
   * para enviar o lembrete em horário comercial.
   */
  criarLembretesParaFatura(
    faturaId: string,
    dataVencimento: string,
  ): LembreteAgendado[] {
    const vencimento = new Date(dataVencimento + 'T12:00:00Z');

    const regua: { tipo: TipoLembrete; diasOffset: number }[] = [
      { tipo: TipoLembrete.D_MENOS_3, diasOffset: -3 },
      { tipo: TipoLembrete.D_MAIS_1, diasOffset: 1 },
      { tipo: TipoLembrete.D_MAIS_7, diasOffset: 7 },
    ];

    return regua.map(({ tipo, diasOffset }) => {
      const dataEnvio = new Date(vencimento);
      dataEnvio.setUTCDate(dataEnvio.getUTCDate() + diasOffset);

      const lembrete = this.lembreteRepo.create({
        faturaId,
        tipo,
        dataEnvio,
        status: StatusLembrete.PENDENTE,
        tentativas: 0,
      });

      this.logger.log(
        `Lembrete ${tipo} agendado para ${dataEnvio.toISOString()} (fatura: ${faturaId})`,
      );

      return lembrete;
    });
  }

  /**
   * Busca lembretes pendentes cuja data de envio já passou.
   *
   * Essa query é o coração do scheduler: ele roda periodicamente
   * e processa apenas os lembretes "prontos" para envio.
   */
  async buscarLembretesProntos(): Promise<LembreteAgendado[]> {
    return this.lembreteRepo.find({
      where: {
        status: StatusLembrete.PENDENTE,
        dataEnvio: LessThanOrEqual(new Date()),
      },
      relations: ['fatura'],
      order: { dataEnvio: 'ASC' },
    });
  }

  /**
   * Atualiza o status de um lembrete após tentativa de envio.
   *
   * Usa `update` (query direta) em vez de `save` (load + save) para
   * minimizar race conditions em cenários concorrentes. O `update`
   * gera um UPDATE SQL atômico sem precisar carregar a entidade.
   */
  async marcarComoEnviado(lembreteId: string): Promise<void> {
    await this.lembreteRepo.update(lembreteId, {
      status: StatusLembrete.ENVIADO,
      erro: null,
    });
  }

  async marcarComoFalhou(
    lembreteId: string,
    erro: string,
    tentativas: number,
  ): Promise<void> {
    await this.lembreteRepo.update(lembreteId, {
      status: StatusLembrete.FALHOU,
      erro,
      tentativas,
    });
  }

  /**
   * Recoloca lembrete na fila para retry, mantendo status como PENDENTE
   * mas incrementando o contador de tentativas.
   */
  async incrementarTentativa(
    lembreteId: string,
    tentativas: number,
    erro: string,
  ): Promise<void> {
    await this.lembreteRepo.update(lembreteId, {
      tentativas,
      erro,
    });
  }
}
