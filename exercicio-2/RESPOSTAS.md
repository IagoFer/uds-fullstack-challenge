# Exercício 2 — Respostas sobre Code Review e Debugging

## 1. Problemas Identificados no Código

### Problema 1: Busca sem filtro no banco (Full Table Scan)

```typescript
const todas = await this.faturaRepo.find();
```

O `.find()` sem cláusula `where` executa um `SELECT * FROM faturas` e carrega **todos os registros** do banco para a memória do Node.js. Em uma plataforma B2B com milhares de clientes, isso significa trazer dezenas ou centenas de milhares de faturas a cada requisição. O consumo de memória cresce linearmente com o tamanho da tabela, podendo causar `OutOfMemoryError` e derrubar o processo inteiro.

### Problema 2: Filtragem em memória em vez de SQL

```typescript
const filtradas = todas.filter(f => f.userId === userId);
```

O filtro é feito em JavaScript após carregar todos os dados. Isso tem duas consequências graves:

- **Performance**: o banco de dados é projetado para filtrar dados de forma eficiente via índices B-tree. Fazer isso em memória desperdiça a capacidade do PostgreSQL e sobrecarrega o Node.js (que é single-threaded).
- **Segurança**: todas as faturas de todos os clientes passam pela memória da aplicação antes de serem descartadas. Em um cenário de dump de memória (heap snapshot) ou logging acidental, dados sensíveis de outros clientes poderiam ser expostos.

### Problema 3: Ausência de Guard de autenticação

```typescript
async listarFaturas(@Req() req) {
  // ...
  const userId = req.user?.id;
```

O optional chaining (`?.`) indica que `req.user` pode ser `undefined`. Isso significa que não há um Guard (@UseGuards) garantindo que o usuário esteja autenticado. Se `req.user` for `undefined`, o `userId` será `undefined`, e o `.filter()` retornará um array vazio na maioria dos casos, mas o comportamento é frágil e dependente do middleware de autenticação estar configurado corretamente em outra parte do código.

### Problema 4: Falta de tipagem no parâmetro

```typescript
async listarFaturas(@Req() req) {
```

O parâmetro `req` não tem tipagem explícita. Isso significa que o TypeScript não consegue ajudar a detectar erros em tempo de compilação. Se alguém acessar `req.user.id` sem o `?`, o compilador não reclamaria, mas o código quebraria em runtime quando o usuário não estivesse autenticado.

### Problema 5: Sem paginação

O endpoint retorna todas as faturas do usuário de uma vez. Para um cliente com centenas de faturas, isso gera payloads grandes, consumo de banda desnecessário e lentidão no frontend para renderizar a lista.

### Problema 6: Sem ordenação definida

O código não especifica uma ordem para os resultados. O PostgreSQL não garante uma ordem padrão, então a cada requisição os dados podem vir em ordem diferente, causando inconsistência na experiência do usuário.

---

## 2. Código Corrigido

A versão corrigida está no arquivo [`src/fatura-corrigida.controller.ts`](./src/fatura-corrigida.controller.ts).

Resumo das correções aplicadas:

| Problema | Correção |
|---|---|
| Full table scan | `where: { userId: user.id }` filtra diretamente no SQL |
| Filtragem em memória | Eliminada, o banco faz todo o trabalho |
| Sem Guard | `@UseGuards(JwtAuthGuard)` garante autenticação |
| Sem tipagem | `@CurrentUser() user: { id: string }` com decorator tipado |
| Sem paginação | `skip/take` + `findAndCount` com DTO validado |
| Sem ordenação | `order: { createdAt: 'DESC' }` para consistência |

---

## 3. Como esse bug de isolamento poderia ter passado nos testes

Esse bug é perigoso justamente porque ele funciona corretamente na maioria dos cenários de teste. Existem três razões principais:

**Primeiro, testes com dados insuficientes.** Se o ambiente de teste tem apenas um usuário ou poucas faturas, o `.filter()` sempre retorna os dados corretos. O bug de isolamento só se manifesta quando existem faturas de múltiplos usuários no banco e o volume é suficiente para causar pressão na memória ou timing issues.

**Segundo, testes sem concorrência.** Testes unitários e de integração são executados sequencialmente. O bug descrito ("retorna dados de um cliente para outro") provavelmente está relacionado a um cenário de race condition sob carga: quando o Node.js está sob pressão de memória (por causa do `.find()` sem filtro), o garbage collector pode pausar a execução. Se o middleware de autenticação depende de algum estado compartilhado ou cache, essa pausa pode causar a atribuição incorreta de `req.user` entre requisições concorrentes. Testes sequenciais nunca reproduzem esse cenário.

**Terceiro, confiança no optional chaining.** O `req.user?.id` mascara o problema real. Em vez de falhar de forma visível (throw 401), ele silenciosamente define `userId` como `undefined` e retorna um array vazio. Nenhum teste que valide "o endpoint retorna faturas" vai falhar, porque ele retorna algo, só não retorna os dados certos.

Para pegar esse bug em testes, seria necessário:
- Testes de integração com múltiplos usuários no banco simultâneamente
- Testes de carga (k6, Artillery) simulando requisições concorrentes com usuários diferentes
- Assertions que validam que o usuário A nunca recebe faturas do usuário B

---

## Pergunta de Follow-Up: Estratégias para 500 requisições simultâneas

### Estratégia 1: Índice composto no banco de dados

A correção mais fundamental. Criar um índice no campo `user_id` da tabela de faturas garante que o PostgreSQL resolva a query com uma busca O(log n) em vez de um full scan O(n).

```sql
CREATE INDEX idx_faturas_user_id ON faturas (user_id);

-- Se as queries quase sempre ordenam por data:
CREATE INDEX idx_faturas_user_id_created_at ON faturas (user_id, created_at DESC);
```

O índice composto cobre tanto o filtro (`WHERE user_id = ?`) quanto a ordenação (`ORDER BY created_at DESC`) em uma única operação, eliminando a necessidade de sort em memória. Esse é o tipo de melhoria que resolve 90% dos problemas de performance em endpoints de listagem.

### Estratégia 2: Cache com invalidação por evento

Para dados que não mudam a cada segundo (como uma lista de faturas), implementar cache com Redis reduz drasticamente a carga no banco:

```typescript
// Ao listar: verificar cache antes de consultar o banco
const cacheKey = `faturas:${userId}:page:${page}`;
const cached = await this.redis.get(cacheKey);
if (cached) return JSON.parse(cached);

// Ao criar/atualizar fatura: invalidar cache do usuário
await this.redis.del(`faturas:${userId}:*`);
```

Com um TTL de 30 a 60 segundos, 500 requisições simultâneas do mesmo usuário resultariam em apenas 1 query real ao banco. A invalidação por evento (ao criar nova fatura) garante que o cache nunca fica desatualizado por mais que o TTL.
