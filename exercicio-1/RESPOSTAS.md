# Respostas de Follow-Up — Exercício 1

## 1. O que acontece se o job de agendamento cair exatamente no momento do envio de um lembrete? Como você evitaria duplicidade ou perda?

Esse é um cenário real e crítico em qualquer sistema de agendamento. Vou dividir em dois sub-problemas: **perda** e **duplicidade**.

### Perda

Se o job cair no meio do processamento, os lembretes que ainda não foram marcados como `enviado` permanecem com status `pendente` no banco. Na próxima execução do cron (1 minuto depois), eles serão recoletados pela query `WHERE status = 'pendente' AND data_envio <= NOW()` e processados normalmente. Ou seja, a arquitetura é **naturalmente resiliente a quedas** porque o estado de "pendente" é o default e o banco de dados é a fonte de verdade.

O único caso de perda real seria se o processo cair **depois** de enviar o e-mail mas **antes** de marcar como `enviado`. Nesse caso, o lembrete seria reprocessado e o e-mail enviado duas vezes — o que nos leva ao próximo ponto.

### Duplicidade

Para evitar envio duplicado, apliquei três estratégias complementares:

1. **Status como flag de idempotência**: o scheduler só processa lembretes com `status = 'pendente'`. Assim que um lembrete é marcado como `enviado`, ele não é mais selecionado. A janela de duplicidade é estreita apenas o intervalo entre o envio efetivo do e-mail e o UPDATE no banco.

2. **Guard de concorrência no processo**: o flag `isRunning` no `LembreteSchedulerService` impede que duas execuções do cron sobreponham no mesmo processo. Se a execução anterior ainda estiver rodando quando o próximo tick do cron disparar, a nova execução é ignorada.

3. **Limite de tentativas**: o campo `tentativas` garante que um lembrete com problema recorrente não seja processado infinitamente. Após 3 falhas, ele é marcado como `falhou` e sai do pool de processamento.

### O que eu faria em produção para eliminar a janela de duplicidade restante

Em um ambiente com múltiplas instâncias, o flag `isRunning` não é suficiente. Implementaria:

- **Lock distribuído com Redis (ou `pg_advisory_lock`)**: antes de processar um lembrete, o scheduler tentaria adquirir um lock com chave `lembrete:{id}`. Se outra instância já tiver o lock, pula o lembrete. O lock expira automaticamente para evitar deadlocks.
- **Coluna `processando_em` (timestamp)**: em vez de apenas `pendente/enviado`, o scheduler marcaria o lembrete com um timestamp de início de processamento. Se o processo cair, outro scheduler detectaria que o timestamp é muito antigo exemplo: > 5 minutos e reprocessaria.
- **Idempotency key no serviço de e-mail**: registrar um hash `fatura_id + tipo + data_envio` como chave de idempotência no provider de e-mail (ex: SendGrid suporta isso nativamente). Assim, mesmo com envio duplicado, o provider ignora a segunda tentativa.

---

## 2. Por que você escolheu a abordagem de agendamento que escolheu? Quais os trade-offs em relação a uma alternativa como AWS SQS + Lambda?

### Por que `@nestjs/schedule`

Escolhi o `@nestjs/schedule` por tres motivos práticos alinhados ao contexto da startup descrita no desafio:

1. **Simplicidade operacional**: o time é de 2 devs + 1 PM. Manter um cron job dentro do próprio processo NestJS significa zero infraestrutura adicional. Não precisa configurar filas, lambdas e nem monitorar serviços extras.

2. **Suficiente para o volume atual**: uma startup B2B de gestão financeira para pequenas empresas provavelmente processa centenas ou poucos milhares de lembretes por dia. Um cron job com polling a cada minuto lida tranquilamente com esse volume. Otimizar prematuramente para milhões seria over-engineering.

3. **Transição futura simples**: a interface do código (buscar pendentes → processar → atualizar status) é agnóstica ao mecanismo de disparo. Migrar para SQS + Lambda no futuro significaria trocar o "trigger" (cron → mensagem na fila) sem alterar a lógica de negócio.

### Trade-offs: `@nestjs/schedule` vs `AWS SQS + Lambda`

| Aspecto | @nestjs/schedule (escolhido) | AWS SQS + Lambda |
|---|---|---|
| **Complexidade operacional** | Baixa pois roda dentro do próprio app | Alta pois exige config de fila, DLQ, Lambda, IAM |
| **Custo** | Zero adicional (EC2 já existe) | Custo por mensagem + invocação Lambda |
| **Escalabilidade** | Vertical (limitado ao EC2) | Horizontal (auto-scaling nativo) |
| **Latência do envio** | Até 1 minuto de delay (intervalo do cron) | Próximo de tempo real (push-based) |
| **Resiliência a falhas** | Retry manual implementado no código | DLQ nativa, retry automático, at-least-once delivery |
| **Garantia de entrega** | At-most-once sem lock distribuído | At-least-once nativo |
| **Observabilidade** | Logs da aplicação, precisa customizar | CloudWatch Metrics, alarms, tracing nativo |
| **Experiência necessária** | JavaScript/NestJS | JavaScript + AWS (IAM, SQS, CloudWatch) |

### Quando migraria para SQS + Lambda?

- Volume acima de ~10.000 lembretes/dia onde o polling ficaria ineficiente.
- Necessidade de latência sub-segundo no envio.
- Múltiplas instâncias do app onde o cron duplicado se torna um problema recorrente.
- Exigência regulatória de guaranteed delivery com audit trail completo.

A decisão de usar cron agora e migrar depois é consciente e pragmática, não é dívida técnica, é adequação ao momento do produto.
