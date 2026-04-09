import { Injectable, BadRequestException } from '@nestjs/common';
import { PaymentGatewayPort } from '../ports/payment-gateway.port';
import { StripeAdapter } from '../adapters/stripe.adapter';
import { AsaasAdapter } from '../adapters/asaas.adapter';
import { SoapBankAdapter } from '../adapters/soap-bank.adapter';

/**
 * Factory de Gateways de Pagamento.
 *
 * Responsável por selecionar o adapter correto em tempo de execução
 * com base no identificador do gateway.
 *
 * Por que uma Factory e não injeção direta?
 * - O cliente configura qual gateway usar no momento do cadastro.
 * - A decisão de qual adapter usar é dinâmica, não estática.
 * - Facilita adicionar novos gateways: basta criar o adapter e registrar aqui.
 *
 * Alternativa considerada: usar o ModuleRef do NestJS para resolver
 * providers dinamicamente. Funciona, mas acopla ao container de DI.
 * A Factory é mais explícita e testável.
 */
@Injectable()
export class PaymentGatewayFactory {
  private readonly gateways: Map<string, PaymentGatewayPort>;

  constructor(
    private readonly stripe: StripeAdapter,
    private readonly asaas: AsaasAdapter,
    private readonly soapBank: SoapBankAdapter,
  ) {
    this.gateways = new Map<string, PaymentGatewayPort>([
      ['stripe', this.stripe],
      ['asaas', this.asaas],
      ['banco_legado', this.soapBank],
    ]);
  }

  /**
   * Retorna o adapter do gateway solicitado.
   *
   * @param gatewayName - Identificador do gateway ('stripe' | 'asaas' | 'banco_legado')
   * @throws BadRequestException se o gateway não for suportado
   */
  getGateway(gatewayName: string): PaymentGatewayPort {
    const gateway = this.gateways.get(gatewayName);

    if (!gateway) {
      const supported = Array.from(this.gateways.keys()).join(', ');
      throw new BadRequestException(
        `Gateway "${gatewayName}" não suportado. Opções disponíveis: ${supported}`,
      );
    }

    return gateway;
  }

  /**
   * Lista todos os gateways registrados e seu status de saúde.
   * Útil para dashboards de monitoramento.
   */
  async healthCheckAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [name, gateway] of this.gateways) {
      try {
        results[name] = await gateway.isHealthy();
      } catch {
        results[name] = false;
      }
    }

    return results;
  }
}
