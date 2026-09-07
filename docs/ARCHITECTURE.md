# Arquitetura BHON

> Estado real do repositório em 7 de setembro de 2026. Decisões futuras devem ser registradas em `DECISIONS.md` antes de serem apresentadas como implementadas.

## Visão do produto

A BHON é o sistema operacional clínico que converte sinais dispersos em uma fila priorizada de ações: dado → contexto → oportunidade → ação → resultado.

## Stack implementada

### Frontend

- React 18, TypeScript e Vite
- Wouter para roteamento
- Tailwind CSS e componentes próprios
- `AuthContext` para a sessão autenticada
- Agenda, Pacientes, prontuário, Overview, Tratamentos, Orçamentos, Oportunidades, Follow-ups e Financeiro consomem a API; `OperationalDataContext` permanece apenas nos módulos legados ainda não migrados

### Backend

- Node.js, TypeScript e Fastify 5
- Prisma 7 com adapter PostgreSQL
- API HTTP organizada hoje em `auth`, `tenants`, `clinical`, `workflow`, `recovery` e `finance`
- Sessões opacas persistidas no PostgreSQL
- composição testável em `buildApp`; o entrypoint inicia apenas o listener HTTP

### Dados

- PostgreSQL como fonte de verdade
- Todas as consultas operacionais devem restringir por `tenantId`
- Mutações que atravessam módulos usam transações Prisma
- Redis, BullMQ, Docker, Azure e MFA são capacidades-alvo; não estão implementados neste repositório

### Deploy piloto

- Vercel Services publica Vite e Fastify no mesmo projeto e domínio
- `/auth/*`, `/api/*` e `/health/*` são roteados para o serviço Fastify; as demais rotas vão para a SPA
- Supabase usa pooler transacional no runtime serverless e conexão direta/session para migrations
- Segredos são cadastrados somente no ambiente do backend; o frontend não recebe credenciais

## Componentes e fluxo

```text
Navegador React
  ├─ /auth/* ───────────────┐
  └─ /api/* ────────────────┼─> Fastify
                             │    ├─ autenticação/RBAC/tenant
Cookie HttpOnly bhon_session ┘    ├─ rotas clínicas
                                  ├─ Recovery Engine
                                  └─ Financeiro transacional
                                         │
                                         v
                                Prisma → PostgreSQL
```

1. O login valida e-mail e senha com bcrypt e cria um token aleatório.
2. Apenas o SHA-256 do token é persistido; o valor original fica em cookie HttpOnly.
3. Cada requisição protegida resolve sessão, usuário e clínica no servidor.
4. RBAC define quem pode ler ou executar cada operação.
5. O Recovery Engine consulta follow-ups, orçamentos, oportunidades, tratamentos e recebíveis reais, normaliza prioridade e entrega uma fila única.
6. A execução de um follow-up atualiza o domínio, a timeline e a auditoria na mesma transação.
7. Uma baixa financeira cria um recibo, atualiza o saldo e sincroniza o lançamento financeiro sob lock transacional.

## Limites de segurança

- O `tenantId` efetivo vem da sessão. Troca de contexto só é aceita para `PLATFORM_OWNER`, com validação e auditoria.
- Mutações autenticadas por cookie exigem uma origem presente na allowlist CORS.
- Login é limitado por janela de tentativas por IP e e-mail.
- Bearer token está desabilitado por padrão e só pode ser habilitado explicitamente para integrações controladas.
- Credenciais, chaves e segredos pertencem ao ambiente; nunca ao repositório ou ao frontend.
- produção falha na inicialização se `COOKIE_SECRET` tiver menos de 32 caracteres ou se `CORS_ORIGINS` estiver ausente.
- erros de validação e falhas internas retornam envelopes seguros; detalhes permanecem somente nos logs estruturados.

## Estrutura atual

```text
backend/
  prisma/               schema, migrations e seed
  src/domain/            regras puras e testáveis
  src/lib/               autenticação, Prisma e middleware
  src/routes/            endpoints HTTP
  test/                  testes de domínio e segurança
frontend/
  src/components/        componentes visuais e operacionais
  src/context/           sessão e estado legado em migração
  src/lib/               cliente HTTP
  src/pages/             superfícies de clínica e plataforma
docs/                    produto, marca, decisões, auditoria e roadmap
```

## Próximas fronteiras arquiteturais

1. Remover `localStorage` dos módulos restantes de Equipe, Notificações e operação da plataforma; o núcleo clínico e financeiro já usa APIs como fonte operacional.
2. Separar o arquivo clínico monolítico em serviços por domínio.
3. Adicionar testes de integração com PostgreSQL para isolamento multi-tenant, RBAC e transações.
4. Extrair workers e filas apenas quando existirem tarefas assíncronas reais e requisitos de escala medidos.
5. Introduzir observabilidade, backups testados, gestão central de segredos e política formal de retenção/LGPD antes de produção.

