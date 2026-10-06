# Plano de Implementação — Preparação Comercial BHON

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: usar `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para implementar este plano tarefa por tarefa. As etapas usam caixas de seleção (`- [ ]`) para acompanhamento.

**Objetivo:** transformar a BHON em um piloto comercial tecnicamente seguro, removendo promessas não verificadas e implementando as proteções operacionais que independem de credenciais externas.

**Arquitetura:** novos controles persistentes ficam no PostgreSQL e são acessados apenas pelo backend Fastify/Prisma. O frontend consome estados da API em vez de fixtures locais, enquanto recursos que dependem de infraestrutura externa permanecem explicitamente desabilitados até receberem configuração válida.

**Tecnologias:** React 18, TypeScript, Vite, Fastify 5, Prisma 7, PostgreSQL, Stripe, Resend HTTP API, Vitest e `node:test`.

**Especificação:** `docs/superpowers/specs/2026-10-06-commercial-readiness-design.md`

## Restrições globais

- Não criar cobrança, enviar e-mail, alterar assinatura Supabase/Vercel ou expor credenciais.
- Nunca registrar senha, token de redefinição, conteúdo clínico ou segredo em logs, auditoria ou respostas públicas.
- Manter o isolamento por `tenantId`; o endpoint público de recuperação não pode revelar se o e-mail existe.
- Checkout público permanece bloqueado enquanto `LEGAL_COMMERCIAL_APPROVED` não for `true`.
- Implementar testes primeiro e observar a falha antes do código de produção.

## Foco de revisão

- Token de recuperação vencido, usado ou pertencente a outro usuário deve sempre ser recusado e não revogar sessão alguma.
- Mais de uma instância do backend deve bloquear a sexta tentativa dentro da mesma janela de quinze minutos.
- Evento Stripe reprocessado não pode provisionar uma segunda clínica nem duplicar a transição de assinatura.
- Falha de API na área Owner deve exibir indisponibilidade, nunca substituir a tela por números de exemplo.
- Uma configuração ausente de e-mail, Stripe, cron ou aprovação jurídica deve bloquear apenas o recurso correspondente com mensagem honesta.

---

### Tarefa 1: Corrigir bloqueio comercial, preço e contrato de senha

**Arquivos:**
- Modificar: `backend/src/domain/billing-catalog.ts`, `backend/src/routes/public-signup.ts`, `backend/src/domain/trial-signup.ts`
- Modificar: `frontend/src/pages/public/StartTrialPage.tsx`, `frontend/src/pages/login/LoginPage.tsx`
- Criar/modificar testes: `backend/test/trial-signup.test.mjs`, `backend/test/public-signup.test.mjs`, `frontend/src/pages/public/StartTrialPage.test.tsx`

**Interfaces:**
- Produz `isCommercialSignupEnabled(env): boolean` e resposta `COMMERCIAL_SIGNUP_UNAVAILABLE`.
- Mantém `validateTrialSignup(input)` com mínimo de doze caracteres.

- [ ] Escrever testes que falham para checkout bloqueado sem aprovação jurídica, senha de 8–11 caracteres rejeitada e oferta anual exibindo R$ 2.900/ano e R$ 241,67/mês.
- [ ] Executar os testes isolados e confirmar falha pelas regras ainda ausentes.
- [ ] Implementar `isCommercialSignupEnabled`, bloquear criação/checkout público quando não aprovado, alinhar validação e cópia da tela.
- [ ] Rodar testes isolados e as suítes frontend/backend correspondentes.
- [ ] Commit: `fix: guard public commercial signup`.

### Tarefa 2: Criar persistência para recuperação de senha e limite distribuído

**Arquivos:**
- Modificar: `backend/prisma/schema.prisma`
- Criar: `backend/prisma/migrations/<timestamp>_commercial_security/migration.sql`
- Criar: `backend/src/domain/password-recovery.ts`, `backend/src/domain/durable-rate-limit.ts`
- Criar/modificar testes: `backend/test/password-recovery.test.mjs`, `backend/test/durable-rate-limit.test.mjs`, `backend/test/billing-schema.test.mjs`

**Interfaces:**
- Produz `createPasswordResetToken(userId, database, now): { rawToken, expiresAt }` e `consumePasswordResetToken(rawToken, database, now)`.
- Produz `checkDurableRateLimit({ scope, identifier, maximumAttempts, windowMs }, database, now)`.
- Cria modelos `PasswordResetToken` e `SecurityRateLimit` com digests SHA-256, expiração e índices de limpeza.

- [ ] Escrever testes falhos para token de uso único, expiração, invalidação de token anterior e limite compartilhado entre dois adaptadores de banco.
- [ ] Executar testes e confirmar que falham pela ausência dos modelos/funções.
- [ ] Criar migration aditiva e implementar os dois domínios sem expor token ou identificador cru.
- [ ] Rodar testes de domínio, `prisma validate` e verificador de migrations.
- [ ] Commit: `feat: add durable commercial security controls`.

### Tarefa 3: Implementar recuperação de senha por entrega configurável

**Arquivos:**
- Criar: `backend/src/lib/password-recovery-delivery.ts`
- Modificar: `backend/src/routes/auth.ts`, `backend/src/lib/auth.ts`, `backend/.env.example`
- Modificar: `frontend/src/context/AuthContext.tsx`, `frontend/src/pages/login/LoginPage.tsx`
- Criar/modificar testes: `backend/test/password-recovery-http.test.mjs`, `frontend/src/pages/login/LoginPage.test.tsx`

**Interfaces:**
- Produz `getPasswordRecoveryConfiguration(env)` e `deliverPasswordReset(input, fetchImpl)`.
- Expõe `POST /auth/password-recovery`, `POST /auth/password-reset` e `GET /auth/password-recovery/status`.
- Redefinição válida atualiza hash da senha, consome o token e revoga todas as sessões do usuário.

- [ ] Escrever testes falhos para resposta genérica de e-mail desconhecido, provedor ausente, link de uso único e revogação de sessões.
- [ ] Executar testes e confirmar falha por rotas/entrega ausentes.
- [ ] Implementar rotas, entrega Resend sem logar token e interface que somente oferece recuperação autoatendida quando configurada.
- [ ] Rodar testes HTTP e de login; verificar que nenhum teste revela token em resposta ou log.
- [ ] Commit: `feat: add safe password recovery`.

### Tarefa 4: Trocar limites em memória pelos limites duráveis

**Arquivos:**
- Modificar: `backend/src/routes/auth.ts`, `backend/src/routes/public-signup.ts`, `backend/src/domain/security.ts`
- Modificar testes: `backend/test/auth-http.test.mjs`, `backend/test/public-signup.test.mjs`

**Interfaces:**
- Consome `checkDurableRateLimit` da Tarefa 2.
- Mantém respostas `LOGIN_RATE_LIMITED` e `TRIAL_RATE_LIMITED`, com `Retry-After` correto.

- [ ] Escrever testes falhos que usam dois repositórios simulando instâncias diferentes e atingem o mesmo limite.
- [ ] Executar e confirmar a falha do limitador em memória atual.
- [ ] Substituir `SlidingWindowRateLimiter` nos fluxos públicos; manter a classe somente se ainda houver uso explicitamente local e seguro.
- [ ] Rodar testes de autenticação e cadastro público.
- [ ] Commit: `fix: persist public endpoint rate limits`.

### Tarefa 5: Tornar o processamento Stripe recuperável

**Arquivos:**
- Modificar: `backend/prisma/schema.prisma`, migration da Tarefa 2 ou migration Stripe dedicada
- Modificar: `backend/src/domain/stripe-events.ts`, `backend/src/routes/stripe-webhook.ts`, `backend/src/app.ts`, `backend/.env.example`, `vercel.json`
- Criar: `backend/src/routes/internal-operations.ts`
- Modificar testes: `backend/test/stripe-webhook.test.mjs`, `backend/test/app.test.mjs`

**Interfaces:**
- Produz `retryPendingStripeEvents({ limit, now }, database)`.
- Expõe `POST /api/internal/stripe/retry` protegido por `CRON_SECRET` e aceita somente eventos não processados abaixo do orçamento de tentativas.
- Registra `retryCount`, `lastAttemptAt` e erro sanitizado, sem retornar 200 como estado concluído internamente.

- [ ] Escrever testes falhos para falha persistida, retry autorizado, retry sem segredo rejeitado e evento já provisionado idempotente.
- [ ] Executar testes e confirmar que o evento atual não tem caminho de recuperação.
- [ ] Implementar campos, domínio de retry, rota interna e configuração de cron sem executar ou cadastrar credenciais.
- [ ] Rodar testes Stripe/App e confirmar que o retry não duplica tenant, usuário ou assinatura.
- [ ] Commit: `fix: make Stripe event processing recoverable`.

### Tarefa 6: Substituir o Owner fictício por dados de API

**Arquivos:**
- Criar/modificar: `backend/src/routes/platform-operations.ts`, `backend/src/lib/middleware.ts`, `backend/src/app.ts`
- Modificar: `frontend/src/lib/platform-owner.ts`, `frontend/src/pages/platform/PlatformUsersPage.tsx`, `frontend/src/pages/platform/PlatformSettingsPage.tsx`, `frontend/src/pages/platform/PlatformClinicDetailPage.tsx`
- Modificar: `frontend/src/context/OperationalDataContext.tsx`, `frontend/src/App.tsx`
- Criar/modificar testes: `backend/test/platform-operations-http.test.mjs`, `frontend/src/pages/platform/PlatformUsersPage.test.tsx`, `frontend/src/pages/platform/PlatformSettingsPage.test.tsx`

**Interfaces:**
- Expõe `GET /api/platform/operations-status` e `GET /api/platform/users`, ambos somente para `PLATFORM_OWNER`.
- Produz no cliente `loadPlatformOperationsStatus()` e `loadPlatformUsers()`.
- Nenhuma tela de Owner importa `initialData` ou apresenta backup, Multi-AZ, Asaas ou Stripe como ativo sem resposta real da API.

- [ ] Escrever testes falhos para bloqueio por papel, lista real de usuários e estados “não configurado” sem dados de exemplo.
- [ ] Executar testes e confirmar que as telas ainda usam fixtures locais.
- [ ] Implementar rotas e refatorar telas; remover o uso de dados operacionais locais no fluxo Owner.
- [ ] Rodar testes de plataforma e busca estática garantindo que `pages/platform` não importe `initialData` nem `useOperationalData`.
- [ ] Commit: `fix: make platform owner console data-backed`.

### Tarefa 7: Remover alegações de documentos e integrações não implementadas

**Arquivos:**
- Modificar: `frontend/src/pages/clinic/OperationsPages.tsx`, `frontend/src/pages/platform/PlatformIntegrationsPage.tsx`, `frontend/src/pages/public/LegalPage.tsx`, `frontend/src/components/public/PublicFaq.tsx`
- Criar/modificar testes: `frontend/src/pages/clinic/OperationsPages.test.tsx`, `frontend/src/pages/platform/PlatformIntegrationsPage.test.tsx`, `frontend/src/pages/public/PublicExperience.test.tsx`

**Interfaces:**
- Documentos são apresentados como links externos cadastrados, não como armazenamento clínico da BHON.
- Integrações exibem “configuração pendente” até uma conexão persistida e validada.

- [ ] Escrever testes falhos para cópia que diferencia link externo, rascunho assistido e integração efetivamente conectada.
- [ ] Executar testes e confirmar a cópia comercial imprecisa atual.
- [ ] Atualizar interfaces e textos públicos sem prometer envio automático ou armazenamento seguro inexistente.
- [ ] Rodar testes de páginas afetadas.
- [ ] Commit: `fix: remove unsupported product claims`.

### Tarefa 8: Corrigir cadeia de dependências e garantir build reproduzível

**Arquivos:**
- Modificar: `backend/package.json`, `backend/package-lock.json`, `backend/Dockerfile.vercel`, `.github/workflows/ci.yml`
- Criar/modificar: `docs/DEPENDENCY_SECURITY.md`

**Interfaces:**
- Docker de produção usa `npm ci`; nenhum build pode alterar seu lockfile.
- Auditoria de dependência de produção tem resultado documentado e aceita somente exceções justificadas.

- [ ] Escrever um check falho de CI que exige instalação imutável e falha quando o lockfile diverge.
- [ ] Executar o check contra o Dockerfile atual e confirmar que ele usa `npm install`.
- [ ] Atualizar resolução de dependências e lockfile, trocar Docker para `npm ci` e registrar quaisquer vulnerabilidades transitivas sem correção disponível.
- [ ] Rodar `npm ci`, auditoria de produção, typecheck, testes e build no backend.
- [ ] Commit: `build: make backend dependency resolution reproducible`.

### Tarefa 9: Evidências de release e gates externos

**Arquivos:**
- Criar: `docs/COMMERCIAL_RELEASE_CHECKLIST.md`, `docs/INCIDENT_RESPONSE_RUNBOOK.md`
- Modificar: `docs/VERCEL_DEPLOYMENT.md`, `README.md`, `.github/workflows/ci.yml`
- Criar: `scripts/check-commercial-release.mjs`
- Criar/modificar testes: `backend/test/commercial-release-check.test.mjs`

**Interfaces:**
- `node scripts/check-commercial-release.mjs` interrompe um release se variáveis de guardrail, cron/retry ou documentação obrigatória estiverem ausentes no ambiente de validação.
- A checklist separa claramente verificações automatizáveis de ações humanas obrigatórias.

- [ ] Escrever teste falho para checklist que não bloqueia ausência de aprovação jurídica ou cron secret.
- [ ] Executar e confirmar a ausência do gate de release atual.
- [ ] Implementar o script e os documentos de backup/restauração, incidentes, LGPD, Stripe live, SMTP, monitoramento, piloto e rollback.
- [ ] Rodar o script contra um ambiente sem segredos e confirmar que falha de modo seguro; executar a suíte documental/CI sem imprimir segredos.
- [ ] Commit: `docs: add commercial release gates`.

### Tarefa 10: Verificação final e revisão de branch

**Arquivos:**
- Sem mudança de produto esperada; atualizar somente evidências de release se algum comando revelar requisito não documentado.

**Interfaces:**
- Consome todas as tarefas anteriores.
- Produz um relatório com comandos, resultado, limitações e itens externos pendentes.

- [ ] Executar `npm ci`, testes, typecheck e build no frontend e backend; executar auditoria de dependências e `git diff --check`.
- [ ] Executar smoke público não autenticado e validar que checkout continua protegido sem aprovação jurídica.
- [ ] Revisar todo o diff buscando segredo, fixture de Owner, mensagens enganosas e quebra de isolamento.
- [ ] Commit final de documentação, se necessário, e solicitar revisão independente da branch.
