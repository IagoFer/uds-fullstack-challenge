# Exercício 1 — Régua de Cobranças (NestJS + PostgreSQL)

## Descrição

Módulo `CobrancaModule` para NestJS que implementa uma **régua de cobranças automatizada**. Ao criar uma fatura, o sistema agenda automaticamente 3 lembretes por e-mail:

| Lembrete | Momento | Objetivo |
|---|---|---|
| **D-3** | 3 dias antes do vencimento | Lembrete preventivo |
| **D+1** | 1 dia após o vencimento | Aviso de atraso |
| **D+7** | 7 dias após o vencimento | Alerta de inadimplência |

## Tecnologias

- **NestJS** 10.x com TypeScript
- **TypeORM** com PostgreSQL
- **@nestjs/schedule** para o cron job de processamento de lembretes
- **@nestjs/passport** + **@nestjs/jwt** para autenticação JWT
- **@nestjs/swagger** para documentação interativa da API
- **@nestjs/throttler** para rate limiting (proteção contra abuso)
- **class-validator** + **class-transformer** para validação de entrada
- **Resend** para envio real de e-mails transacionais

## Pré-requisitos

- **Node.js** 18+
- **PostgreSQL** 14+ rodando localmente (ou via Docker)
- **Conta Resend** (opcional, para envio real de e-mails) — [resend.com](https://resend.com)

> [!IMPORTANT]
> **Nota sobre o Resend**: Se você estiver usando uma conta gratuita/nova no Resend, você só conseguirá enviar e-mails para o **mesmo endereço de e-mail que você usou para se cadastrar** no Resend (ou domínios verificados). Se tentar enviar para um e-mail aleatório, o Resend retornará um erro de "Unauthorized". Portanto, ao criar a fatura no Postman para teste, use o seu e-mail de cadastro.

## Como Rodar

### 1. Criar o banco de dados

```sql
CREATE DATABASE uds;
```

### 2. Configurar variáveis de ambiente

```bash
# Na raiz da pasta exercicio-1
cp .env.example .env # Se o arquivo .env.example existir, ou crie o .env manualmente
```

Edite o `.env` com suas credenciais:
```env
# Banco de Dados
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=sua_senha
DB_DATABASE=uds

# Autenticação JWT
JWT_SECRET=uds-challenge-secret-key-2026
JWT_EXPIRES_IN=1h

# Resend (E-mail transacional)
RESEND_API_KEY=re_sua_chave
RESEND_FROM_EMAIL=onboarding@resend.dev

# Configurações de Negócio
MAX_TENTATIVAS=3
```

### 3. Instalar dependências

```bash
cd exercicio-1
npm install
```

### 4. Executar migrations

```bash
npm run migration:run
```

### 5. Iniciar a aplicação

```bash
npm run start:dev
```

A aplicação estará disponível em `http://localhost:3000/api`.

A documentação Swagger estará em `http://localhost:3000/api/docs`.

## Fluxo de Autenticação

Todos os endpoints de faturas são **protegidos por JWT**. O fluxo é:

### 1. Obter token JWT

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "5c47937d-b657-4b53-911b-c689f0744769",
    "email": "admin@empresa.com"
}'
```

**Resposta:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsIn..."
}
```

### 2. Usar o token nos endpoints protegidos

Adicione o header `Authorization: Bearer <token>` em todas as requisições.

## Endpoints

### `POST /api/auth/login` — Gerar token JWT (público)

### `POST /api/faturas` — Criar fatura e agendar lembretes (autenticado)

```bash
curl -X POST http://localhost:3000/api/faturas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <seu_token>" \
  -d '{
    "descricao": "Mensalidade Plano Pro - Abril/2026",
    "valor": 299.90,
    "dataVencimento": "2026-04-20",
    "devedorNome": "João Silva",
    "devedorEmail": "[SEU EMAIL CADASTRADO NO RESEND]joao@empresa.com"
  }'
```

> Note que o `userId` **não** é enviado no body — é extraído automaticamente do token JWT, garantindo isolamento multi-tenant.

**Resposta (201):**
```json
{
  "message": "Fatura criada com sucesso. Lembretes agendados.",
  "data": {
    "id": "uuid-da-fatura",
    "descricao": "Mensalidade Plano Pro - Abril/2026",
    "valor": 299.90,
    "dataVencimento": "2026-04-20",
    "status": "pendente",
    "lembretes": [
      { "tipo": "D-3", "dataEnvio": "2026-04-17T12:00:00.000Z", "status": "pendente" },
      { "tipo": "D+1", "dataEnvio": "2026-04-21T12:00:00.000Z", "status": "pendente" },
      { "tipo": "D+7", "dataEnvio": "2026-04-27T12:00:00.000Z", "status": "pendente" }
    ]
  }
}
```

### `GET /api/faturas` — Listar minhas faturas (autenticado)

### `GET /api/faturas/:id` — Buscar fatura por ID (autenticado)

## Scripts de Migration

| Comando | Descrição |
|---|---|
| `npm run migration:create -- src/migrations/Nome` | Cria um arquivo de migration vazio |
| `npm run migration:run` | Executa migrations pendentes |
| `npm run migration:revert` | Reverte a última migration executada |
| `npm run migration:generate -- src/migrations/Nome` | Gera migration a partir das diferenças entre entities e banco |

## Estrutura do Projeto

```
src/
├── main.ts                              # Bootstrap + Swagger + ValidationPipe
├── app.module.ts                        # Módulo raiz (TypeORM + Schedule + Throttler + Auth)
├── data-source.ts                       # Configuração do TypeORM CLI (migrations)
├── auth/
│   ├── auth.module.ts                   # Módulo de autenticação
│   ├── auth.controller.ts              # POST /auth/login
│   ├── auth.service.ts                 # Geração de tokens JWT
│   ├── guards/
│   │   └── jwt-auth.guard.ts           # Guard de autenticação JWT
│   ├── strategies/
│   │   └── jwt.strategy.ts             # Estratégia Passport para validação JWT
│   ├── decorators/
│   │   └── current-user.decorator.ts   # @CurrentUser() parameter decorator
│   └── dto/
│       └── login.dto.ts                # DTO de login com validação
├── cobranca/
│   ├── cobranca.module.ts              # Módulo de cobrança
│   ├── enums/
│   │   └── index.ts                    # StatusFatura, StatusLembrete, TipoLembrete
│   ├── entities/
│   │   ├── fatura.entity.ts            # Entidade Fatura (TypeORM)
│   │   └── lembrete-agendado.entity.ts # Entidade LembreteAgendado (TypeORM)
│   ├── dto/
│   │   └── create-fatura.dto.ts        # DTO com validação + Swagger
│   ├── controllers/
│   │   └── fatura.controller.ts        # Endpoints REST protegidos
│   └── services/
│       ├── fatura.service.ts           # Criação transacional de faturas
│       ├── lembrete.service.ts         # CRUD e queries de lembretes
│       ├── lembrete-scheduler.service.ts # Cron job de processamento
│       └── email.service.ts            # Envio de e-mail via Resend
└── migrations/
    ├── 1775761121550-CreateFatura.ts         # Migration: tabela fatura
    └── 1775761136979-CreateLembreteAgendado.ts  # Migration: tabela lembrete_agendado
```

## Segurança

- **JWT Authentication**: Todos os endpoints de faturas exigem token Bearer válido
- **Rate Limiting**: 100 req/min global, 10 req/min no POST /faturas
- **Isolamento Multi-tenant**: userId extraído do JWT, não do payload
- **Validação rigorosa**: whitelist + forbidNonWhitelisted no ValidationPipe
- **Migrations**: Versionamento completo do schema

## Decisões de Modelagem

As justificativas detalhadas estão nos comentários JSDoc de cada entity. Resumo:

- **UUID** como ID: evita IDs sequenciais previsíveis (segurança em APIs REST)
- **DECIMAL(12,2)** para valores: precisão financeira sem erros de floating-point
- **DATE** para vencimento: a régua opera em dias, não horas
- **Enums para status**: controle explícito do ciclo de vida, evita "magic strings"
- **Transação atômica**: fatura + lembretes são criados juntos ou nenhum é criado
- **Tentativas com limite**: evita loops infinitos no scheduler
- **Índices compostos**: `(status, data_envio)` otimiza a query do scheduler

## Respostas de Follow-Up

As respostas detalhadas sobre resiliência do job e trade-offs de arquitetura estão no arquivo [`RESPOSTAS.md`](./RESPOSTAS.md).
