# Deploy da BHON na Vercel

A BHON usa Vercel Services para publicar Vite e Fastify no mesmo projeto e domínio. O PostgreSQL do Supabase continua sendo a fonte de verdade.

## Topologia

```text
Navegador -> Vercel BHON-PLATFORM
               |-- /auth/*, /api/*, /health/* -> backend Fastify
               `-- demais rotas                 -> frontend Vite
                                                    |
backend Fastify -> Prisma -> Supabase Postgres -----'
```

O roteamento same-origin preserva cookies HttpOnly e elimina a necessidade de expor a API em outro domínio. As rotas da API ainda validam origem, sessão, tenant e RBAC.

## 1. Configurar o projeto

1. Importe `robertoamarante209/BHON-PLATFORM` na Vercel usando a raiz do repositório.
2. Em **Settings > Build and Deployment**, selecione o framework **Services**.
3. Mantenha **Root Directory** como `./`.
4. O `vercel.json` da raiz define os serviços `frontend` e `backend` e seus roteamentos.
5. Use Node.js 20 ou superior.

## 2. Variáveis de ambiente

Cadastre os valores diretamente no painel da Vercel para Preview e Production. Não envie os valores ao repositório, ao chat ou a logs.

| Variável | Uso | Obrigatória |
| --- | --- | --- |
| `DATABASE_URL` | Supavisor transaction mode, porta 6543, para o runtime | sim |
| `DIRECT_URL` | conexão direta ou Supavisor session mode, porta 5432, para migrations | sim para migrations |
| `COOKIE_SECRET` | assinatura dos cookies; valor aleatório forte | sim |
| `CORS_ORIGINS` | URL HTTPS exata do deployment, sem barra final | sim |
| `NODE_ENV` | use `production` | sim |
| `ALLOW_BEARER_AUTH` | mantenha `false` | recomendado |

Na Vercel serverless, `DATABASE_URL` deve usar o pooler transacional do Supabase. Comece com `connection_limit=1` e ajuste somente com métricas. A conexão de migrations deve usar `DIRECT_URL`.

## 3. Aplicar migrations

Faça backup antes da primeira aplicação em um banco com dados. Em uma estação ou pipeline confiável, configure `DIRECT_URL` sem imprimir o valor e execute:

```text
npx prisma migrate deploy
```

Não execute `prisma migrate dev` em produção. Migrations também não devem rodar em cada função ou requisição.

## 4. Validar o deployment

```text
GET https://<deployment>/health/live  -> 200
GET https://<deployment>/health/ready -> 200 com database=connected
```

Depois valide:

- login cria cookie `bhon_session` com `HttpOnly`, `Secure` e `SameSite=Lax`;
- atualizar a página mantém a sessão;
- logout revoga a sessão no banco;
- criar e reler um paciente comprova persistência;
- tenant e perfil sem permissão recebem `403` nos testes negativos;
- logs não exibem senha, cookie, URL de banco ou corpo sensível;
- Preview e Production usam bancos e segredos separados quando houver dados reais;
- backup e restauração do Supabase foram testados antes de dados clínicos reais.

O deployment técnico não equivale, sozinho, a prontidão para dados sensíveis. Observabilidade, recuperação de senha, testes de integração multi-tenant, política LGPD e restauração testada continuam sendo gates de produção.
