import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PaymentGatewayPort,
  ProcessPaymentInput,
  PaymentResult,
  PaymentStatus,
  RefundResult,
} from '../ports/payment-gateway.port';

/**
 * Adapter para o Asaas.
 *
 * Traduz a interface genérica PaymentGatewayPort para chamadas
 * específicas da API REST do Asaas.
 *
 * Diferenças notáveis em relação ao Stripe:
 * - Asaas trabalha com "Cobrança" (billing) em vez de "PaymentIntent"
 * - Valores são enviados em reais (não centavos)
 * - A autenticação é via header `access_token` (não Bearer)
 */
@Injectable()
export class AsaasAdapter implements PaymentGatewayPort {
  readonly gatewayName = 'asaas';
  private readonly logger = new Logger(AsaasAdapter.name);
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = config.get('ASAAS_API_URL') || 'https://sandbox.asaas.com/api/v3';
    // API Key: config.get('ASAAS_API_KEY')
  }

  async processPayment(input: ProcessPaymentInput): Promise<PaymentResult> {
    this.logger.log(`[Asaas] Criando cobrança: R$ ${input.amountInCents / 100}`);

    // Asaas recebe valor em reais, não centavos
    // const response = await fetch(`${this.baseUrl}/payments`, {
    //   method: 'POST',
    //   headers: {
    //     'access_token': this.config.get('ASAAS_API_KEY'),
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     customer: input.customerId,
    //     billingType: 'CREDIT_CARD',
    //     value: input.amountInCents / 100,
    //     description: input.description,
    //     externalReference: input.idempotencyKey,
    //   }),
    // });

    return {
      gatewayTransactionId: `asaas_pay_${Date.now()}`,
      status: PaymentStatus.PENDING, // Asaas retorna PENDING inicialmente
      amountCharged: input.amountInCents,
      processedAt: new Date(),
      rawResponse: { provider: 'asaas', mock: true },
    };
  }

  async getTransactionStatus(gatewayTransactionId: string): Promise<PaymentStatus> {
    this.logger.log(`[Asaas] Consultando status: ${gatewayTransactionId}`);
    // const response = await fetch(`${this.baseUrl}/payments/${gatewayTransactionId}`, {...});
    // return this.mapAsaasStatus(response.status);
    return PaymentStatus.CONFIRMED;
  }

  async refund(gatewayTransactionId: string, amountInCents?: number): Promise<RefundResult> {
    this.logger.log(`[Asaas] Estornando transação: ${gatewayTransactionId}`);
    // const response = await fetch(`${this.baseUrl}/payments/${gatewayTransactionId}/refund`, {...});

    return {
      gatewayRefundId: `asaas_ref_${Date.now()}`,
      status: 'pending', // Asaas processa estornos de forma assíncrona
      amountRefunded: amountInCents || 0,
    };
  }

  async isHealthy(): Promise<boolean> {
    // const response = await fetch(`${this.baseUrl}/finance/balance`, {...});
    // return response.ok;
    return true;
  }
}
