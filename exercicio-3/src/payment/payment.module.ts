import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StripeAdapter } from './adapters/stripe.adapter';
import { AsaasAdapter } from './adapters/asaas.adapter';
import { SoapBankAdapter } from './adapters/soap-bank.adapter';
import { PaymentGatewayFactory } from './factory/payment-gateway.factory';
import { PaymentService } from './services/payment.service';

/**
 * Módulo de Pagamento.
 *
 * Registra todos os adapters de gateway e expõe o PaymentService
 * para ser consumido por outros módulos (ex: FaturaModule).
 *
 * Para adicionar um novo gateway:
 * 1. Criar o adapter em /adapters implementando PaymentGatewayPort.
 * 2. Registrá-lo como provider aqui.
 * 3. Adicioná-lo no Map da PaymentGatewayFactory.
 *
 * Nenhuma alteração necessária no PaymentService ou nos controllers.
 */
@Module({
  imports: [ConfigModule],
  providers: [
    // Adapters de gateway
    StripeAdapter,
    AsaasAdapter,
    SoapBankAdapter,

    // Factory para seleção dinâmica
    PaymentGatewayFactory,

    // Serviço de domínio
    PaymentService,
  ],
  exports: [PaymentService, PaymentGatewayFactory],
})
export class PaymentModule { }
