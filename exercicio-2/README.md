# Exercício 2 — Code Review e Debugging

## Descrição

Análise de um trecho de código legado encontrado em produção que apresentava dois problemas críticos: lentidão intermitente no endpoint de listagem e vazamento de dados entre usuários.

## Estrutura

```
src/
├── fatura-legado.controller.ts     # Código original (problemático)
└── fatura-corrigida.controller.ts  # Código corrigido
```

## Resumo dos Problemas

| # | Problema | Severidade | Tipo |
|---|---|---|---|
| 1 | Full table scan (`find()` sem `where`) | Crítica | Performance |
| 2 | Filtragem em memória (`.filter()`) | Crítica | Segurança |
| 3 | Sem Guard de autenticação | Alta | Segurança |
| 4 | Sem tipagem no `@Req()` | Média | Manutenibilidade |
| 5 | Sem paginação | Média | Performance |
| 6 | Sem ordenação definida | Baixa | UX |

## Respostas Detalhadas

As respostas completas sobre a análise do código, a explicação do bug de isolamento e as estratégias de escalabilidade estão em [`RESPOSTAS.md`](./RESPOSTAS.md).
