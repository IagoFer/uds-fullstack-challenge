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
 * Adapter para o Gateway Bancário Legado (SOAP/XML).
 *
 * Este é o adapter mais complexo por conta do protocolo SOAP:
 * - Comunicação via XML em vez de JSON
 * - Autenticação por certificado digital (mTLS)
 * - Respostas síncronas com códigos de retorno proprietários
 * - Sem suporte nativo a idempotência (precisa ser implementado no nosso lado)
 *
 * Em produção, usaríamos uma lib como `soap` ou `strong-soap` para
 * consumir o WSDL do banco e gerar o client automaticamente.
 */
@Injectable()
export class SoapBankAdapter implements PaymentGatewayPort {
  readonly gatewayName = 'banco_legado';
  private readonly logger = new Logger(SoapBankAdapter.name);

  constructor(private readonly config: ConfigService) {
    // Em produção:
    // const wsdlUrl = config.get('SOAP_BANK_WSDL_URL');
    // const certPath = config.get('SOAP_BANK_CERT_PATH');
    // this.soapClient = await soap.createClientAsync(wsdlUrl, { wsdl_options: { cert, key } });
  }

  async processPayment(input: ProcessPaymentInput): Promise<PaymentResult> {
    this.logger.log(`[Banco Legado] Enviando transação SOAP: ${input.amountInCents} centavos`);

    // Construção manual do envelope SOAP
    // const xmlBody = `
    //   <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    //                     xmlns:pag="http://banco.com.br/pagamentos">
    //     <soapenv:Body>
    //       <pag:ProcessarPagamento>
    //         <pag:Valor>${input.amountInCents}</pag:Valor>
    //         <pag:CodigoCliente>${input.customerId}</pag:CodigoCliente>
    //         <pag:ChaveIdempotencia>${input.idempotencyKey}</pag:ChaveIdempotencia>
    //       </pag:ProcessarPagamento>
    //     </soapenv:Body>
    //   </soapenv:Envelope>
    // `;

    // Tratamento especial: SOAP não tem idempotência nativa.
    // Precisamos verificar no NOSSO banco se essa chave já foi processada
    // antes de enviar para o gateway.

    return {
      gatewayTransactionId: `soap_txn_${Date.now()}`,
      status: PaymentStatus.PROCESSING, // SOAP geralmente retorna "em processamento"
      amountCharged: input.amountInCents,
      processedAt: new Date(),
      rawResponse: { provider: 'banco_legado', protocol: 'SOAP', mock: true },
    };
  }

  async getTransactionStatus(gatewayTransactionId: string): Promise<PaymentStatus> {
    this.logger.log(`[Banco Legado] Consultando status SOAP: ${gatewayTransactionId}`);
    // const result = await this.soapClient.ConsultarStatusAsync({ CodigoTransacao: gatewayTransactionId });
    // return this.mapBankStatusCode(result.CodigoRetorno);
    return PaymentStatus.CONFIRMED;
  }

  async refund(gatewayTransactionId: string, amountInCents?: number): Promise<RefundResult> {
    this.logger.log(`[Banco Legado] Solicitando estorno SOAP: ${gatewayTransactionId}`);
    // Bancos legados geralmente exigem estorno total (sem parcial)
    // e o processo pode levar dias úteis

    return {
      gatewayRefundId: `soap_ref_${Date.now()}`,
      status: 'pending',
      amountRefunded: amountInCents || 0,
    };
  }

  async isHealthy(): Promise<boolean> {
    // Bancos legados costumam ter janelas de manutenção
    // Verificar via endpoint de echo/ping do WSDL
    // try {
    //   await this.soapClient.PingAsync({});
    //   return true;
    // } catch {
    //   return false;
    // }
    return true;
  }
}
