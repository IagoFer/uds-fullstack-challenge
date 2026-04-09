# Registro de Uso de IA — AI_USAGE.md

Conforme as instruções do desafio, este documento detalha como ferramentas de IA foram utilizadas no desenvolvimento deste projeto.

## Ferramentas Utilizadas
- **Gemini**: Atuou como parceiro para estruturação do código e sugestão de arquitetura.

## Exercício 1 — Régua de Cobranças

### Onde a IA auxiliou:
- **Estruturação de Pastas**: Sugestão da organização modular do NestJS (controllers, services, entities, dto).
- **Lógica do Scheduler**: Implementação do cron job usando `@nestjs/schedule` com tratamento de erro e controle de tentativas.
- **Transação Atômica**: Sugestão de usar `QueryRunner` do TypeORM para garantir que a fatura e os lembretes sejam salvos em uma única transação de banco de dados.
- **Segurança e Produção**: Implementação do módulo de Auth (JWT) e Rate Limiting via Throttler.

### O que eu alterei ou decidi diferente:
- **Refatoração para Migrations**: Inicialmente a IA sugeriu `synchronize: true` para rapidez no teste. Eu decidi desativar essa opção e implementar o fluxo completo de **Migrations via TypeORM CLI**, pois considero que para uma vaga de nível Pleno/Sênior, o controle versionado do schema do banco é obrigatório.
- **Divisão das Migrations**: A IA sugeriu uma migration única. Eu fiz a divisão em arquivos separados para seguir um fluxo de desenvolvimento realista e organizado.
- **Correção de UUID**: Identifiquei que os IDs de exemplo gerados pela IA não seguiam o padrão rigoroso de versão 4 (exigido pelo `class-validator`) e corrigi os payloads de teste.
- **ConfigModule Global**: Ajustei a configuração do `ConfigModule` para ser global (`isGlobal: true`), facilitando o acesso às variáveis de ambiente em todos os módulos sem imports repetitivos.

## Exercício 2 — Code Review e Debugging

### Onde a IA auxiliou:
- **Formatação das Respostas**: Após identificar os problemas no código legado, usei a IA para organizar as respostas em um formato mais claro e estruturado.
- **Detecção de Problema Sutil**: A IA apontou a ausência de `ORDER BY` na query, que eu não havia priorizado. Sem ordenação explícita, o PostgreSQL não garante a ordem dos resultados entre execuções, o que pode causar inconsistência na experiência do usuário.

### O que eu alterei ou decidi diferente:
- **Reescrita Completa**: Em vez de apenas corrigir os bugs pontuais, decidi reescrever o controller seguindo os mesmos padrões que já havia estabelecido no Exercício 1 (JwtAuthGuard, @CurrentUser, PaginacaoDto), garantindo consistência arquitetural entre os exercícios.


## Exercício 3 — Decisão de Arquitetura

### Onde a IA auxiliou:
- **Escrita de Código**: Geração do boilerplate e estrutura das classes baseada nos padrões **Strategy** e **Adapter** que eu já conhecia e solicitei a implementação para agilizar o processo.
- **Redação Técnica**: Auxílio na formatação e redação das respostas sobre resiliência (Idempotência e Reconciliação).

### O que eu alterei ou decidi diferente:
- **Refinamento de Interfaces**: Ajustei as assinaturas dos métodos nos Adapters para garantir que as particularidades de cada gateway (como valores em reais vs centavos) fossem tratadas sem "vazar" para o domínio da aplicação.
