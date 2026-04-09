# Exercício 3 — Decisão de Arquitetura: Integração Multi-Gateway

## Descrição

Proposta de arquitetura para integração com múltiplos gateways de pagamento (Stripe, Asaas e gateway bancário legado via SOAP) no backend NestJS.

Este exercício não exige implementação completa. Os arquivos `.ts` demonstram a **estrutura e os contratos** da solução proposta, com comentários detalhados explicando o que cada parte faria em produção.

## Padrão Utilizado

**Strategy + Adapter (Ports & Adapters / Hexagonal Architecture)**

O domínio define uma interface genérica (`PaymentGatewayPort`) e cada gateway implementa essa interface em seu próprio adapter. Uma Factory seleciona o adapter correto em runtime.

## Estrutura do Código

```
src/payment/
├── ports/
│   └── payment-gateway.port.ts      # Interface universal (contrato)
├── adapters/
│   ├── stripe.adapter.ts            # Implementação Stripe (REST)
│   ├── asaas.adapter.ts             # Implementação Asaas (REST)
│   └── soap-bank.adapter.ts         # Implementação Banco Legado (SOAP)
├── factory/
│   └── payment-gateway.factory.ts   # Seleção dinâmica do gateway
├── services/
│   └── payment.service.ts           # Orquestração de pagamento
└── payment.module.ts                # Registro dos providers
```

## Respostas Detalhadas

As respostas completas para as 4 perguntas do exercício estão no arquivo [`RESPOSTAS.md`](./RESPOSTAS.md):

1. **Padrão de Design**: Strategy + Adapter com justificativa e alternativas consideradas.
2. **Isolamento de Lógica**: Separação em camadas (Domínio, Infraestrutura, Seleção).
3. **Falhas Parciais**: Estado PROCESSING, Job de Reconciliação e Idempotency Keys.
4. **Armazenamento de Credenciais**: AWS Secrets Manager com evolução para Vault.
