# Teste Prático — Desenvolvedor Fullstack Pleno

Repositório com as soluções dos três exercícios práticos da avaliação técnica.

## Estrutura

| Pasta | Exercício | Descrição |
|---|---|---|
| [`/exercicio-1`](./exercicio-1) | Desenvolvimento Backend | Régua de Cobranças (NestJS + PostgreSQL) |
| [`/exercicio-2`](./exercicio-2) | Code Review e Debugging | Análise e correção de código legado |
| [`/exercicio-3`](./exercicio-3) | Decisão de Arquitetura | Integração multi-gateway de pagamento |

## Stack

- **Backend**: Node.js + NestJS + TypeScript
- **Banco de Dados**: PostgreSQL + TypeORM
- **Autenticação**: JWT (Passport)
- **E-mail**: Resend
- **Documentação**: Swagger (OpenAPI)

## Como começar

Cada exercício possui seu próprio `README.md` com instruções detalhadas. Para o exercício 1 (que é o único com código executável):

```bash
cd exercicio-1
npm install
npm run migration:run
npm run start:dev
```

A documentação da API estará disponível em `http://localhost:3000/api/docs`.
