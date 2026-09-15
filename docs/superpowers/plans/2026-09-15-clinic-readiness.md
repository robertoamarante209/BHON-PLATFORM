# Clinic Readiness Implementation Plan

> For agentic workers: use superpowers:subagent-driven-development task by task, with task review and whole-branch review.

**Goal:** Entregar o escopo clínico aprovado e publicar as mudanças verificadas.
**Architecture:** React/Wouter consome API Fastify com sessão por cookie e Prisma/PostgreSQL. Novos cadastros seguem tenant e autorização do servidor.
**Tech Stack:** React, TypeScript, Vitest, Fastify, node:test, Prisma, PGlite, Vercel, Supabase.
**Spec:** docs/superpowers/specs/2026-09-15-clinic-readiness.md

## Global Constraints

- Integrações somente para PLATFORM_OWNER, sem ativar conectores.
- Disponibilidade apenas registrada; não bloquear agendamentos.
- Dados fictícios somente em ambiente descartável.
- Preservar isolamento, permissões, cookies e histórico.
- Publicar GitHub/Supabase/Vercel após testes e revisão.

## Task 1: Sessão, painel e acesso às integrações

**Files:** frontend/src/App.tsx, context/AuthContext.tsx, components/shell/{TopHeader,Sidebar,ClinicLayout,PlatformSidebar}.tsx, pages/clinic/{OverviewPage,SettingsPage}.tsx, pages/login/LoginPage.tsx, index.css; backend/src/routes/operations.ts; testes correspondentes.

**Interfaces:** Manter useAuth e API pública existentes. Criar helper/contexto do dia clínico somente se necessário para compartilhar atualização. Preparação owner em /platform/integrations não ativa conexões.

- [ ] Instalar com npm ci e executar suites baseline. Reproduzir sessão transitória, navegação desconhecida e atualização do contador em testes reais de componentes/HTTP.
- [ ] Teste discriminante: autenticar, devolver 503 em refreshSession e verificar sessão preservada com erro recuperável; devolver 401 e verificar sessão encerrada. Rotas clínicas válidas e fallback autenticado não exibem login.
- [ ] Teste discriminante: mudar atendimento para CONCLUIDO e verificar atualização do resumo/cabeçalho; falha não exibe falso zero, mudança de dia troca consulta. Verificar singular/plural e saudação.
- [ ] Implementar correções mínimas e textos exatos da especificação, cores contrastantes e movimento reduzido.
- [ ] Remover todas as entradas clínicas de integrações e proteger acesso/API para owner. Testar rejeição HTTP para perfil clínico e acesso owner ao novo destino.
- [ ] Executar testes afetados, build frontend e backend; commit e relatório de evidências.

## Task 2: Disponibilidade e modelos de protocolo

**Files:** backend/prisma/schema.prisma e nova migration aditiva; backend/src/domain/availability.ts, routes/clinic-configuration.ts, app.ts; frontend/src/lib/clinicConfiguration.ts, components/settings/AvailabilityEditor.tsx, ProtocolEditor.tsx, pages/clinic/SettingsPage.tsx; testes HTTP, domínio, componentes e migration.

**Interfaces:** GET/PUT /api/settings/availability com escopo clinic ou professionalId e revisão otimista; GET/POST/PATCH /api/settings/protocols para modelos tenant-scoped. Intervalos {dayOfWeek:0..6,start:'HH:mm',end:'HH:mm'} e professionalId opcional. Protocolo {title,description,steps:string[],isActive,version}.

- [ ] Testar rejeição de horários inválidos/sobrepostos, usuário sem permissão, profissional de outra clínica e edição desatualizada.
- [ ] Testar persistência real em PostgreSQL descartável e edição/reabertura pela interface.
- [ ] Criar tabelas, FKs, índices, versão, RLS e revogação Data API; manter Prisma migration history.
- [ ] Implementar API e editores acessíveis, incluindo dias fechados e pausas via intervalos.
- [ ] Testar protocolos com título/etapas válidos, ordenação, desativação e isolamento. Testar migrations e suites afetadas; commit e relatório.

## Task 3: Orçamentos e validação das jornadas

**Files:** frontend/src/pages/clinic/BudgetsPage.tsx, lib/clinic.ts e backend/src/routes/{clinical,workflow}.ts conforme lacunas; testes de jornada.

- [ ] Traçar criação existente de tratamento/orçamento; testar criação, valores, aprovação, recebível e idempotência concorrente.
- [ ] Completar entrada de criação na interface usando contratos existentes; reproduzir e corrigir falhas com regressões.
- [ ] Verificar cadastro de paciente, agendamento, atendimento, orçamento e protocolo em ambiente descartável.
- [ ] Rodar suites completas, builds, migrations e navegador responsivo; revisão final.

## Task 4: Publicação e comprovação

- [ ] Verificar identidade do projeto Supabase e Vercel correspondente ao repositório.
- [ ] Enviar branch/PR ao GitHub, verificar checks, aplicar migration validada ao banco correto e conferir catálogo.
- [ ] Integrar alterações aprovadas e verificar deployment READY do commit publicado.
- [ ] Smoke HTTP, saúde do banco, controles sem sessão e logs de erro; relatório final com URLs e limitações reais.
