# BHON Platform

Sistema operacional clínico da BHON — **A clínica no controle.**

## Estado atual

O repositório contém uma SPA React/Vite e uma API Fastify/Prisma/PostgreSQL. Autenticação, parte do núcleo clínico e a primeira fila real do Recovery Engine estão conectados ao banco. Os demais módulos ainda estão em migração do estado local para APIs persistidas.

Leia antes de desenvolver:

- [`docs/ENGINEERING_AUDIT.md`](docs/ENGINEERING_AUDIT.md) — diagnóstico A–K e ordem de recuperação
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — arquitetura implementada e fronteiras
- [`docs/SECURITY_REMEDIATION.md`](docs/SECURITY_REMEDIATION.md) — hardening aplicado e limites
- [`docs/VERCEL_DEPLOYMENT.md`](docs/VERCEL_DEPLOYMENT.md) — deploy Vercel + Supabase sem expor segredos

## Desenvolvimento local

Pré-requisitos: Node.js 24+, npm e PostgreSQL.

1. Configure `DATABASE_URL`, `COOKIE_SECRET` e, se necessário, `CORS_ORIGINS` no ambiente do backend.
2. Execute `npm ci` em `backend/` e `frontend/`.
3. No backend, execute `npx prisma generate`, aplique as migrations e inicie com `npm run dev`.
4. No frontend, inicie com `npm run dev`.

Validação:

```text
backend: npm run typecheck && npm test
frontend: npm run build
```

Não use os dados mantidos em `OperationalDataContext` como evidência de persistência multiusuário; eles são uma camada legada em remoção progressiva.

## Deploy

O monorepo está preparado como um projeto Vercel Services, com Vite e Fastify no mesmo domínio e Supabase como PostgreSQL. Siga o guia de deploy e nunca envie o `.env` para o repositório ou para o chat.
