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
 * Adapter para o Stripe.
 *
 * Traduz a interface genérica PaymentGatewayPort para chamadas
 * específicas da SDK do Stripe (REST API).
 *
 * Em produção, usaríamos a SDK oficial: `import Stripe from 'stripe'`
 * Aqui, demonstro a estrutura do adapter sem a dependência real.
 */
@Injectable()
export class StripeAdapter implements PaymentGatewayPort {
  readonly gatewayName = 'stripe';
  private readonly logger = new Logger(StripeAdapter.name);

  constructor(private readonly config: ConfigService) {
    // Em produção: this.stripe = new Stripe(config.get('STRIPE_SECRET_KEY'))
  }

  async processPayment(input: ProcessPaymentInput): Promise<PaymentResult> {
    this.logger.log(`[Stripe] Processando pagamento: ${input.amountInCents} centavos`);

    // Stripe usa PaymentIntents para pagamentos
    // const paymentIntent = await this.stripe.paymentIntents.create({
    //   amount: input.amountInCents,
    //   currency: input.currency,
    //   customer: input.customerId,
    //   description: input.description,
    //   idempotency_key: input.idempotencyKey,
    //   metadata: input.metadata,
    // });

    return {
      gatewayTransactionId: `pi_stripe_${Date.now()}`,
      status: PaymentStatus.CONFIRMED,
      amountCharged: input.amountInCents,
      processedAt: new Date(),
      rawResponse: { provider: 'stripe', mock: true },
    };
  }

  async getTransactionStatus(gatewayTransactionId: string): Promise<PaymentStatus> {
    this.logger.log(`[Stripe] Consultando status: ${gatewayTransactionId}`);
    // const intent = await this.stripe.paymentIntents.retrieve(gatewayTransactionId);
    // return this.mapStripeStatus(intent.status);
    return PaymentStatus.CONFIRMED;
  }

  async refund(gatewayTransactionId: string, amountInCents?: number): Promise<RefundResult> {
    this.logger.log(`[Stripe] Estornando transação: ${gatewayTransactionId}`);
    // const refund = await this.stripe.refunds.create({
    //   payment_intent: gatewayTransactionId,
    //   amount: amountInCents, // undefined = estorno total
    // });

    return {
      gatewayRefundId: `re_stripe_${Date.now()}`,
      status: 'completed',
      amountRefunded: amountInCents || 0,
    };
  }

  async isHealthy(): Promise<boolean> {
    // const balance = await this.stripe.balance.retrieve();
    // return !!balance;
    return true;
  }
}
