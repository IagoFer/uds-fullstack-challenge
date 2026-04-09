import { Injectable, Logger } from '@nestjs/common';
import { PaymentGatewayFactory } from '../factory/payment-gateway.factory';
import {
  ProcessPaymentInput,
  PaymentResult,
  PaymentStatus,
} from '../ports/payment-gateway.port';

/**
 * Serviço de Pagamento — Orquestra o fluxo de pagamento.
 *
 * Este serviço é a camada de domínio. Ele:
 * 1. Recebe a intenção de pagamento do controller.
 * 2. Usa a Factory para obter o adapter correto.
 * 3. Processa o pagamento com tratamento de falhas.
 * 4. Persiste o resultado no banco para auditoria.
 *
 * O serviço NÃO conhece Stripe, Asaas nem SOAP.
 * Ele só conhece a interface PaymentGatewayPort.
 */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly gatewayFactory: PaymentGatewayFactory,
    // Em produção: injetar repositório de transações para persistência
    // private readonly transactionRepo: Repository<PaymentTransaction>,
  ) { }

  /**
   * Processa um pagamento usando o gateway especificado.
   *
   * Fluxo de resiliência:
   * 1. Gera uma idempotency key única (fatura_id + timestamp).
   * 2. Salva o status como PROCESSING no banco ANTES de chamar o gateway.
   * 3. Chama o gateway.
   * 4. Atualiza o status no banco com o resultado.
   * 5. Se timeout/erro: mantém PROCESSING e agenda reconciliação.
   */
  async processPayment(
    gatewayName: string,
    input: ProcessPaymentInput,
  ): Promise<PaymentResult> {
    const gateway = this.gatewayFactory.getGateway(gatewayName);

    this.logger.log(
      `Processando pagamento via ${gateway.gatewayName}: ` +
      `R$ ${(input.amountInCents / 100).toFixed(2)}`,
    );

    // 1. Persistir estado PROCESSING antes de chamar o gateway
    // await this.transactionRepo.save({
    //   idempotencyKey: input.idempotencyKey,
    //   gatewayName,
    //   status: PaymentStatus.PROCESSING,
    //   amount: input.amountInCents,
    // });

    try {
      // 2. Chamar o gateway
      const result = await gateway.processPayment(input);

      // 3. Atualizar com o resultado
      // await this.transactionRepo.update(
      //   { idempotencyKey: input.idempotencyKey },
      //   { status: result.status, gatewayTransactionId: result.gatewayTransactionId },
      // );

      this.logger.log(
        `Pagamento ${result.status}: ${result.gatewayTransactionId}`,
      );

      return result;
    } catch (error) {
      // 4. Em caso de timeout ou erro de rede:
      // NÃO marcar como FAILED! O débito pode ter sido confirmado no gateway.
      // Manter como PROCESSING e agendar job de reconciliação.

      this.logger.error(
        `Erro ao processar pagamento via ${gateway.gatewayName}: ` +
        `${error instanceof Error ? error.message : String(error)}`,
      );

      // await this.transactionRepo.update(
      //   { idempotencyKey: input.idempotencyKey },
      //   { status: PaymentStatus.PROCESSING, lastError: error.message },
      // );

      // Em produção: publicar evento para fila de reconciliação
      // await this.reconciliationQueue.add('reconcile', {
      //   idempotencyKey: input.idempotencyKey,
      //   gatewayName,
      //   gatewayTransactionId: null, // não temos o ID se houve timeout
      // });

      throw error;
    }
  }
}
