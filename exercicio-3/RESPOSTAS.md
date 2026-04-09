# Exercício 3 — Respostas sobre Decisão de Arquitetura

## 1. Qual padrão de design eu usaria e por quê?

Optei pela combinação de **Strategy Pattern + Adapter Pattern**, organizados dentro de uma arquitetura conhecida como **Ports & Adapters (Hexagonal Architecture)**.

A ideia central é simples: o domínio da aplicação define uma interface genérica chamada `PaymentGatewayPort` que descreve **o que** o sistema precisa fazer (processar pagamento, consultar status, estornar). Cada gateway concreto (Stripe, Asaas, banco legado) implementa essa interface em seu próprio adapter, definindo **como** fazer isso para a sua API específica.

Escolhi este padrão por três motivos práticos:

**Primeiro**, o problema pede explicitamente que "novos gateways poderão ser adicionados no futuro". Com Ports & Adapters, adicionar um novo gateway significa criar um único arquivo (o adapter) e registrá-lo na Factory. Nenhum código existente precisa ser alterado. Isso é o princípio Open/Closed do SOLID na prática.

**Segundo**, cada gateway tem um contrato de API completamente diferente. O Stripe usa REST com PaymentIntents, o Asaas usa REST com Cobranças (e valores em reais em vez de centavos), e o banco legado usa SOAP com XML e autenticação por certificado digital. Tentar abstrair essas diferenças sem o padrão Adapter resultaria em condicionais espalhadas pelo código (`if (gateway === 'stripe') {...} else if (gateway === 'asaas') {...}`), o que é exatamente o tipo de código que se torna impossível de manter à medida que o número de gateways cresce.

**Terceiro**, a Factory complementa o padrão ao permitir a seleção dinâmica do adapter em runtime. Cada empresa cliente configura qual gateway utilizar, e essa decisão é feita no momento da requisição, não no momento da compilação.

Alternativas que considerei:
- **Padrão Observer/Event-Driven**: útil se os gateways precisassem ser notificados simultaneamente, mas aqui cada pagamento usa UM gateway específico.
- **Injeção direta via `ModuleRef` do NestJS**: funciona, mas acopla a lógica de seleção ao container de DI do framework. A Factory é mais explícita e mais fácil de testar unitariamente.

---

## 2. Como eu isolaria a lógica específica de cada gateway sem contaminar o domínio?

A separação acontece em três camadas:

**Camada de Domínio** (`payment.service.ts`): Contém a lógica de negócio pura. Sabe que precisa "processar um pagamento" e "tratar falhas", mas não sabe se está falando com o Stripe ou com um mainframe de banco. Ela depende exclusivamente da interface `PaymentGatewayPort`.

**Camada de Infraestrutura** (`adapters/`): Cada adapter é um módulo isolado que traduz a interface genérica para as chamadas específicas de cada gateway. O `StripeAdapter` importa a SDK do Stripe, o `SoapBankAdapter` monta envelopes XML, mas nada disso "vaza" para o serviço de pagamento.

**Camada de Seleção** (`factory/`): A `PaymentGatewayFactory` resolve qual adapter usar com base no identificador do gateway, sem que o serviço precise conhecer as implementações concretas.

Na prática, isso significa que se o Stripe mudar a versão da sua API amanhã e o campo `payment_intent` passar a se chamar `payment_session`, a alteração fica contida 100% dentro do `stripe.adapter.ts`. Nenhum outro arquivo do projeto é afetado.

A estrutura de pastas reflete essa separação:

```
src/payment/
├── ports/           → Contratos (interfaces)
├── adapters/        → Implementações Gateway
├── factory/         → Seleção em Runtime
├── services/        → Lógica de Negócio 
└── payment.module.ts
```

---

## 3. Como eu trataria falhas parciais (timeout após débito confirmado)?

Este é o cenário mais crítico em integrações de pagamento: o gateway debita o cliente, mas nossa aplicação não recebe a confirmação (timeout de rede, crash do servidor, etc.). Se marcarmos como "falhou" e tentarmos de novo, o cliente é cobrado duas vezes.

Minha estratégia é baseada em **três pilares**:

### Pilar 1: Estado intermediário (PROCESSING)

Antes de chamar o gateway, persisto a transação no banco com status `PROCESSING`. Se o gateway responder com sucesso, atualizo para `CONFIRMED`. Se responder com erro explícito, atualizo para `FAILED`.

A regra fundamental neste contexto é: **se houve timeout ou erro de rede, NUNCA marcar como FAILED**. O status permanece `PROCESSING`, sinalizando que precisamos verificar com o gateway o que realmente aconteceu.

### Pilar 2: Job de Reconciliação

Um job periódico (cron ou fila) consulta todas as transações que estão em `PROCESSING` há mais de X minutos e verifica o status real diretamente no gateway via `getTransactionStatus()`. Isso resolve o gap entre o que sabemos e o que realmente aconteceu.

O fluxo do job:
1. Busca transações com `status = PROCESSING` e `updated_at < agora - 5 minutos`.
2. Para cada uma, chama `gateway.getTransactionStatus(transactionId)`.
3. Atualiza o status local com base na resposta do gateway.
4. Se o gateway confirmar o débito, marca como `CONFIRMED`.
5. Se o gateway não encontrar a transação, marca como `FAILED` (pode retentar com segurança).

### Pilar 3: Idempotency Key

Toda chamada ao gateway inclui uma chave de idempotência (composta por `fatura_id + timestamp`). Isso garante que, mesmo que nossa aplicação envie a mesma requisição duas vezes (por retry automático ou pelo job de reconciliação), o gateway processa apenas uma vez. O Stripe suporta isso nativamente. Para o Asaas e o banco legado, implementamos a verificação no nosso lado antes de enviar.

---

## 4. Onde e como eu armazenaria as credenciais de cada gateway?

A resposta para essa pergunta depende do nível de maturidade da infraestrutura.

### No contexto atual do desafio (EC2 + RDS)

Usaria o **AWS Secrets Manager**. Motivos:
- A infraestrutura já está na AWS, então não há custo de integração com outro provedor.
- O Secrets Manager rotaciona credenciais automaticamente (importante para PCI-DSS caso processemos dados de cartão).
- O acesso é controlado via IAM Roles do EC2, sem necessidade de armazenar chaves de acesso ao Secrets Manager no código.
- Ele expõe o segredo como variável de ambiente via integração nativa com ECS/EC2.

A implementação no NestJS ficaria assim:

```typescript
// Cada adapter recebe suas credenciais via ConfigService
constructor(private readonly config: ConfigService) {
  // O ConfigService, configurado com AWS Secrets Manager,
  // resolve 'STRIPE_SECRET_KEY' buscando no vault.
  this.stripe = new Stripe(config.get('STRIPE_SECRET_KEY'));
}
```

### O que eu NÃO faria

- **Variáveis de ambiente no `.env` em produção**: está sujeito a vazamento por logs, dumps de processo ou acesso ao filesystem do servidor.
- **Hardcoded no código**: óbvio, mas vale reforçar, já vi isso em produção.
- **Banco de dados**: credenciais de gateway não são dados de negócio. Elas pertencem à camada de infraestrutura/segurança.

### Em uma evolução futura

Se a startup crescer e adotar Kubernetes, migraria para **Vault (HashiCorp)** ou **AWS Parameter Store com KMS encryption**, que oferecem versionamento de segredos e audit trail completo.

---
