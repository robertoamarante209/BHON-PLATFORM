# BHON Operação Clínica Real Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar logout idempotente, indicadores reais, gestão persistida de ambientes e uma experiência clínica premium, responsiva e verificável.

**Architecture:** Fastify concentra autenticação, RBAC, limites temporais e agregações por clínica. React consome contratos por página, mantém apenas estado transitório de interface e apresenta ausência de dados explicitamente. O PostgreSQL do Supabase permanece a fonte de verdade e a Vercel publica os serviços no mesmo domínio.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Fastify 5, Prisma 7, PostgreSQL 17, Node Test Runner e Vercel Services.

**Spec:** `docs/superpowers/specs/2026-09-09-operacao-clinica-real-design.md`

## Global Constraints

- Preservar o conceito Atelier Clínico e os fluxos já conectados à API.
- Não criar dados clínicos, financeiros, notificações ou métricas fictícias em produção.
- Não versionar nem imprimir credenciais, cookies ou arquivos `.env`.
- Toda consulta e mutação operacional deve restringir por `tenantId` e RBAC.
- Aplicar TDD, revisar as diretrizes de interface e executar build e testes completos antes de cada conclusão.
- Trabalhar na `main` do clone isolado conforme autorização explícita e enviar somente após validação.

---

### Task 1: Logout idempotente

**Files:**
- Modify: `backend/src/routes/auth.ts`
- Test: `backend/test/auth.test.mjs`

**Interfaces:**
- Consumes: sessão autenticada anexada por `requireAuth`.
- Produces: `revokeSession(sessionId, client)` e `POST /auth/logout` tolerante a concorrência.

- [ ] Escrever regressão que simula duas revogações da mesma sessão e exige sucesso nas duas.
- [ ] Executar o teste e confirmar falha porque a revogação ainda usa atualização singular.
- [ ] Implementar atualização condicional por `id` e `revokedAt: null`.
- [ ] Confirmar o teste e a suíte completa.
- [ ] Registrar commit `fix: tornar logout idempotente`.

### Task 2: Contratos de configuração e indicadores

**Files:**
- Create: `backend/src/domain/indicators.ts`
- Create: `backend/src/routes/settings.ts`
- Modify: `backend/src/app.ts`
- Test: `backend/test/indicators.test.mjs`
- Test: `backend/test/settings-http.test.mjs`

**Interfaces:**
- Consumes: Prisma, `requireAuth`, `requireTenant`, `requireRole` e limites de período.
- Produces: `GET /api/settings`, `POST /api/rooms`, `PATCH /api/rooms/:id` e `GET /api/indicators?period=TODAY|WEEK|MONTH`.

- [ ] Escrever testes de limites temporais, razões sem denominador e normalização das métricas.
- [ ] Confirmar as falhas pela ausência do domínio.
- [ ] Implementar funções puras de cálculo e período no fuso clínico.
- [ ] Escrever testes HTTP para autenticação, validação e RBAC dos novos contratos.
- [ ] Implementar rotas com filtros por clínica, transações e auditoria não bloqueante.
- [ ] Confirmar testes, typecheck e commit `feat: adicionar configuracoes e indicadores reais`.

### Task 3: Clientes de API e páginas clínicas

**Files:**
- Modify: `frontend/src/lib/clinic.ts`
- Rewrite: `frontend/src/pages/clinic/IndicatorsPage.tsx`
- Rewrite: `frontend/src/pages/clinic/SettingsPage.tsx`
- Create: `frontend/src/components/common/SectionState.tsx`
- Modify: `frontend/src/types/index.ts`

**Interfaces:**
- Consumes: endpoints da Task 2 e sessão de `AuthContext`.
- Produces: indicadores reais, editor de salas e estados de configuração honestos.

- [ ] Definir tipos explícitos para métricas, períodos e mutações de sala.
- [ ] Implementar cliente HTTP sem waterfalls e com `AbortController`.
- [ ] Migrar Indicadores para loading, erro, ausência de base e produtividade real.
- [ ] Migrar Configurações para dados institucionais reais e CRUD de salas.
- [ ] Substituir módulos sem backend por estados não configurados.
- [ ] Executar build e commit `feat: conectar gestao clinica a dados reais`.

### Task 4: Fluidez, acessibilidade e carregamento

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/components/shell/ClinicLayout.tsx`
- Modify: `frontend/src/components/shell/Sidebar.tsx`
- Modify: componentes e páginas apontados pela auditoria.

**Interfaces:**
- Consumes: rotas clínicas existentes.
- Produces: rotas sob demanda, foco previsível, skip link e microanimações reduzíveis.

- [ ] Medir bundle e localizar imports síncronos e violações das diretrizes atuais.
- [ ] Introduzir carregamento preguiçoso com fallback acessível.
- [ ] Aplicar animações apenas em `opacity` e `transform`, com redução de movimento.
- [ ] Corrigir labels, aria, foco, alvos de toque, overflow e semântica encontrados.
- [ ] Executar build, auditoria textual e commit `design: refinar experiencia atelier clinico`.

### Task 5: Fluxos completos e banco real

**Files:**
- Modify: testes de integração existentes conforme necessário.
- No production patient writes.

**Interfaces:**
- Consumes: contratos de paciente, sala, profissional e agenda.
- Produces: evidência automatizada do fluxo paciente → profissional → ambiente → horário → status.

- [ ] Validar cadastro de paciente e agendamento em ambiente descartável.
- [ ] Validar conflitos, transições de status e isolamento por clínica.
- [ ] Cadastrar o primeiro ambiente real somente após o contrato passar nos testes.
- [ ] Reexecutar advisors de segurança e desempenho.
- [ ] Registrar commit `test: validar fluxo clinico completo` se houver alterações de teste.

### Task 6: Revisão visual e publicação

**Files:**
- Modify: somente arquivos exigidos por falhas encontradas na revisão.

**Interfaces:**
- Consumes: aplicação final local e produção Vercel.
- Produces: versão validada em 375, 768, 1366 e 1920 px.

- [ ] Rodar testes completos, typecheck, build e verificação de migrations.
- [ ] Inspecionar páginas clínicas com teclado, foco, contraste, modais e estados vazios.
- [ ] Verificar os quatro viewports e corrigir regressões.
- [ ] Revisar diff, segredos e arquivos não relacionados.
- [ ] Fazer push da `main`, acompanhar o deploy e executar health checks.
- [ ] Executar smoke test de login, sessão, logout e rejeição da sessão sem expor a senha.
