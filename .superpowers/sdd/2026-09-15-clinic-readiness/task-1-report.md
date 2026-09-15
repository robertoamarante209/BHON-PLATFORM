# Task 1 — Sessão, painel e integrações owner

## Resultado

- Sessões locais agora sobrevivem a falhas transitórias de rede, respostas 5xx e payloads incompletos; somente 401 e os 403 autoritativos `USER_BLOCKED`/`TENANT_UNAVAILABLE` removem o acesso local.
- Revisões de autenticação impedem respostas atrasadas de login, logout e `/auth/me` de sobrescrever o estado mais recente.
- `/`, `/login`, rotas autenticadas conhecidas e rotas desconhecidas recuperam o destino correto conforme o papel ativo, sem cair indevidamente no login.
- Cabeçalho e Visão Geral compartilham a mesma consulta real do dia clínico em `America/Sao_Paulo`, com atualização a cada 60 segundos, no foco e após mutações locais de agenda.
- Falhas de agenda preservam estado indisponível em vez de fabricar zero ou conexão ativa. O indicador verde animado usa `motion-reduce`.
- Cópias aprovadas aplicadas: `Visão Geral`, `Sua operação de hoje, em um só lugar.`, `Nenhuma pendência agora.`, `Bem-vindo à BHON. Sua clínica, pronta para um novo dia.`
- Integrações foram removidas da clínica (menu, configurações e rota), adicionadas como página de preparação em `/platform/integrations`, e seus endpoints foram limitados a `PLATFORM_OWNER`. Nenhum conector foi ativado.
- Contraste em painéis clínicos claros foi corrigido para títulos, nomes e estados de estoque, mantendo as regras escuras existentes.

## Causa raiz e evidência

1. `AuthContext.refreshSession` limpava usuário, clínica e autenticação para qualquer resposta não-2xx e para qualquer rejeição de `fetch`. Assim, indisponibilidade temporária era indistinguível de revogação 401.
2. O fallback global de `AppRoutes` e a raiz sempre apontavam para `/login`; além disso, `/login` não redirecionava uma sessão já autenticada.
3. `TopHeader` e `OverviewPage` consultavam a agenda separadamente, calculavam a data pelo fuso do navegador e convertiam erro do cabeçalho em `[]`, exibindo zero e estado conectado fictícios.
4. Integrações ainda apareciam na navegação/configurações clínicas e os endpoints aceitavam todos os papéis clínicos de leitura/gestão.

## TDD — RED

- `pnpm exec vitest run src/context/AuthContext.test.tsx src/components/shell/Sidebar.test.tsx src/pages/clinic/OverviewPage.test.tsx`
- Resultado observado antes da implementação: 4 falhas esperadas, cobrindo preservação de sessão transitória, remoção do link clínico, cópia/estado indisponível e estado vazio.
- O teste de política backend foi escrito antes da exportação/restrição de `PLATFORM_INTEGRATION_ROLES`.

## GREEN e verificação final

- Frontend: `pnpm test` — 16 arquivos, 41 testes, 41 aprovados.
- Frontend: `pnpm build` — TypeScript e Vite aprovados; 1.601 módulos transformados.
- Backend: `node --import tsx --test test/*.test.mjs` — 47 testes, 47 aprovados.
- Backend: `node_modules/.bin/tsc.cmd` — build aprovado, exit code 0.
- `git diff --check` — sem erros de whitespace (somente avisos de normalização LF/CRLF do Git no Windows).

## Arquivos alterados

- Backend: `src/routes/operations.ts`, `test/operations-http.test.mjs`.
- Sessão/rotas: `frontend/src/context/AuthContext.tsx`, teste correspondente e `frontend/src/App.tsx`.
- Dados diários: novo `DailyAppointmentsContext.tsx`, novo `appointmentEvents.ts`, `ClinicLayout.tsx`, `TopHeader.tsx`, `clinic.ts`, `OverviewPage.tsx` e testes.
- Navegação/cópia/contraste: `Sidebar.tsx` e teste, `PlatformSidebar.tsx`, novo `PlatformIntegrationsPage.tsx`, `SettingsPage.tsx`, `RecoveryQueue.tsx`, `LoginPage.tsx` e teste, `OperationsPages.tsx`, `index.css`.

## Limites e preocupações

- O repositório usa `package-lock.json`, mas o runtime disponibilizado só fornecia pnpm. As dependências foram instaladas por lock importado; artefatos temporários `pnpm-lock.yaml`/`pnpm-workspace.yaml` foram removidos e não entram no commit.
- O pnpm reportou scripts de build ignorados para engines Prisma/esbuild, embora `prisma generate`, todos os testes e builds diretos tenham concluído. O fluxo oficial npm/CI continua sendo a fonte final de instalação.
- A validação visual e a publicação ficam com o owner da tarefa, conforme divisão de responsabilidade. O bug preexistente de `event.currentTarget.reset()` após `await` em inventário/documentos foi apenas registrado, sem ampliação de escopo.
