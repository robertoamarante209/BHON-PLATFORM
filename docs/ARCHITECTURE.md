# Arquitetura BHON

> Estado real do repositório em 6 de setembro de 2026. Decisões futuras devem ser registradas em `DECISIONS.md` antes de serem apresentadas como implementadas.

## Visão do produto

A BHON é o sistema operacional clínico que converte sinais dispersos em uma fila priorizada de ações: dado → contexto → oportunidade → ação → resultado.

## Stack implementada

### Frontend

- React 18, TypeScript e Vite
- Wouter para roteamento
- Tailwind CSS e componentes próprios
- `AuthContext` para a sessão autenticada
- `OperationalDataContext` ainda mantém parte dos módulos legados no navegador; essa persistência é transitória e não é fonte confiável multiusuário

### Backend

- Node.js, TypeScript e Fastify 5
- Prisma 7 com adapter PostgreSQL
- API HTTP organizada hoje em `auth`, `tenants`, `clinical` e `recovery`
- Sessões opacas persistidas no PostgreSQL

### Dados

- PostgreSQL como fonte de verdade
- Todas as consultas operacionais devem restringir por `tenantId`
- Mutações que atravessam módulos usam transações Prisma
- Redis, BullMQ, Docker, Azure e MFA são capacidades-alvo; não estão implementados neste repositório

## Componentes e fluxo

```text
Navegador React
  ├─ /auth/* ───────────────┐
  └─ /api/* ────────────────┼─> Fastify
                             │    ├─ autenticação/RBAC/tenant
Cookie HttpOnly bhon_session ┘    ├─ rotas clínicas
                                  └─ Recovery Engine
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

## Limites de segurança

- O `tenantId` efetivo vem da sessão. Troca de contexto só é aceita para `PLATFORM_OWNER`, com validação e auditoria.
- Mutações autenticadas por cookie exigem uma origem presente na allowlist CORS.
- Login é limitado por janela de tentativas por IP e e-mail.
- Bearer token está desabilitado por padrão e só pode ser habilitado explicitamente para integrações controladas.
- Credenciais, chaves e segredos pertencem ao ambiente; nunca ao repositório ou ao frontend.

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

1. Remover `localStorage` dos domínios clínicos e conectar cada módulo à API.
2. Separar o arquivo clínico monolítico em serviços por domínio.
3. Adicionar testes de integração com PostgreSQL para isolamento multi-tenant, RBAC e transações.
4. Extrair workers e filas apenas quando existirem tarefas assíncronas reais e requisitos de escala medidos.
5. Introduzir observabilidade, backups testados, gestão central de segredos e política formal de retenção/LGPD antes de produção.

