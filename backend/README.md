# BHON Backend

API Fastify + Prisma/PostgreSQL do BHON Clinical Operating System.

## Ambiente

Copie `.env.example` para `.env` e preencha os valores localmente. Nunca versionar `.env`.

Variáveis obrigatórias:

- `DATABASE_URL` — conexão PostgreSQL/Supabase.
- `COOKIE_SECRET` — segredo aleatório usado para assinar cookies; mínimo recomendado de 32 caracteres.

Variáveis opcionais:

- `CORS_ORIGINS` — lista separada por vírgulas; padrão de desenvolvimento `http://localhost:5173`.
- `NODE_ENV`, `PORT`, `HOST`.
- `BHON_SEED_PASSWORD` — senha temporária usada exclusivamente pelo seed local; não é armazenada no repositório.

## Execução

```bash
npm install
npx prisma generate
npm run dev
```

Antes de aplicar migrations em um ambiente real, valide o estado do banco e faça backup conforme o processo de infraestrutura.
