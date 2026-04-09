/**
 * Port (Interface) do Gateway de Pagamento.
 *
 * Este é o contrato universal que TODOS os gateways devem implementar.
 * O domínio da aplicação nunca conhece Stripe, Asaas ou SOAP —
 * ele só conhece esta interface.
 *
 * Padrão utilizado: Strategy + Adapter (Ports & Adapters / Hexagonal Architecture)
 *
 * Por que este padrão?
 * - O domínio define O QUE precisa (processar pagamento, estornar, consultar status).
 * - Cada adapter define COMO fazer isso para cada gateway específico.
 * - Adicionar um novo gateway = criar um novo adapter. Zero alteração no domínio.
 */

export interface ProcessPaymentInput {
  /** Valor em centavos (evita floating point) */
  amountInCents: number;
  currency: string;
  customerId: string;
  description: string;
  /** Chave de idempotência para evitar cobranças duplicadas */
  idempotencyKey: string;
  metadata?: Record<string, string>;
}

export interface PaymentResult {
  /** ID da transação no gateway externo */
  gatewayTransactionId: string;
  status: PaymentStatus;
  /** Valor efetivamente cobrado (pode diferir por taxas) */
  amountCharged: number;
  /** Timestamp do processamento no gateway */
  processedAt: Date;
  /** Dados brutos retornados pelo gateway (para auditoria) */
  rawResponse: Record<string, unknown>;
}

export interface RefundResult {
  gatewayRefundId: string;
  status: 'pending' | 'completed' | 'failed';
  amountRefunded: number;
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

/**
 * Interface que todo adapter de gateway DEVE implementar.
 *
 * Princípio: Dependency Inversion (SOLID).
 * O serviço de pagamento depende desta abstração,
 * nunca de uma implementação concreta.
 */
export interface PaymentGatewayPort {
  /** Identificador único do gateway (ex: 'stripe', 'asaas', 'banco_legado') */
  readonly gatewayName: string;

  /** Processa um pagamento */
  processPayment(input: ProcessPaymentInput): Promise<PaymentResult>;

  /** Consulta o status atual de uma transação */
  getTransactionStatus(gatewayTransactionId: string): Promise<PaymentStatus>;

  /** Realiza estorno total ou parcial */
  refund(gatewayTransactionId: string, amountInCents?: number): Promise<RefundResult>;

  /** Verifica se o gateway está operacional (health check) */
  isHealthy(): Promise<boolean>;
}
