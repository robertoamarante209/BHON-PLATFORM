# Task 3 report — Orçamentos e jornadas reais

## Implementado

- `POST /api/budgets` protegido por `recovery.manage`, isolado por tenant e paciente ativo, com itens e auditoria na mesma transação.
- Cálculo monetário no servidor com inteiros escalados/`BigInt`, precisão de centavos, limites `Decimal(12,2)`, 1..50 itens, quantidade e desconto validados.
- Aprovação serializada por lock determinístico de paciente seguido por lock de orçamento, impedindo que dois orçamentos do mesmo paciente criem tratamentos/recebíveis ativos em paralelo.
- Editor acessível de novo orçamento com busca de pacientes, itens dinâmicos, subtotal/total, preservação do rascunho em erro e guarda contra duplo envio.
- Correção dos resets assíncronos dos formulários de estoque/documentos.
- Saldo do dossiê derivado de `amount - paidAmount` quando a API não fornece `outstandingAmount`.

## RED / GREEN

- RED backend: `budget.ts` ausente ao executar `test/budget.test.mjs`.
- RED frontend: `BudgetEditor.tsx` ausente; documentos reproduziu `Cannot read properties of null (reading 'reset')` após persistência.
- GREEN focado: backend 4/4; frontend 4/4.
- GREEN PostgreSQL real (`TEST_DATABASE_URL=...schema=task3`): 1/1, cobrindo persistência, auditoria, permissão explícita, paciente estrangeiro e aprovação concorrente (200 + 409; 1 tratamento; 1 recebível).

## Verificação final

- Backend completo: 65 testes, 64 aprovados, 1 ignorado sem `TEST_DATABASE_URL`, 0 falhas.
- Frontend completo: 23 arquivos, 59 testes, 0 falhas.
- Backend `tsc`: aprovado.
- Frontend `tsc --noEmit && vite build`: aprovado (1606 módulos).
- `scripts/verify-migrations.mjs`: aprovado; 11 migrations verificadas, nenhuma coluna ausente e nenhum enum divergente.
- Aplicação das 11 migrations em schema PostgreSQL descartável `task3`: aprovada.

## Limites / preocupações

- O teste PostgreSQL é opt-in para não depender do estado local; a suíte normal o ignora quando `TEST_DATABASE_URL` não está definido.
- O driver `pg` emitiu aviso de depreciação durante injeções concorrentes no servidor PGlite local; o comportamento e as asserções concorrentes passaram.
- Não houve deploy, push ou alteração de integrações.
