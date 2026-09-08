# BHON — piloto publicável

Data: 8 de setembro de 2026

## Objetivo

Publicar ainda hoje uma versão piloto acessível da BHON que preserve a arquitetura existente, use o Supabase como fonte de verdade e permita validar os fluxos centrais com segurança. O piloto não será apresentado como produção plena para dados clínicos sensíveis.

## Escopo

- frontend React/Vite e backend Fastify/Prisma compilando sem erros;
- migrations validadas e comparadas com o projeto Supabase `bhon - saas`;
- autenticação, sessão, isolamento por tenant e fluxos clínicos centrais preservados;
- configuração de deploy da Vercel validada e corrigida quando necessário;
- health checks de processo e banco respondendo no deployment;
- nova identidade visual aplicada quando a logo atualizada for anexada;
- `.env`, URLs de banco, cookies, senhas, chaves e tokens fora do Git e dos logs;
- toda alteração material salva em commit antes do deploy.

## Fora do escopo

Ficam para marcos posteriores: MFA, recuperação completa de senha, conciliação bancária, estornos, assinatura digital, observabilidade completa, política LGPD definitiva, backup/restauração formalmente testados e cobertura E2E integral. Falhas críticas nessas áreas serão documentadas como riscos, sem alegação de prontidão plena.

## Arquitetura

O navegador acessa um único domínio Vercel. A interface é atendida pelo serviço Vite; `/auth/*`, `/api/*` e `/health/*` são encaminhados ao Fastify. O backend acessa o PostgreSQL do Supabase pelo pooler adequado ao runtime serverless, enquanto migrations usam conexão direta ou session mode.

Nenhum segredo será escrito no frontend ou versionado. Variáveis obrigatórias serão configuradas apenas no ambiente do backend. O deployment permanece classificado como piloto até a conclusão dos gates de produção do roadmap.

## Estratégia

1. Criar a linha de base com instalação limpa, validação Prisma, verificação de migrations, typecheck, testes e builds.
2. Corrigir falhas determinísticas locais, adicionando teste de regressão antes de mudanças comportamentais.
3. Inspecionar o Supabase de forma somente leitura antes de DDL. Mudanças de schema serão migrations versionadas e verificadas com advisors.
4. Validar vínculo e build na Vercel, configurando somente variáveis necessárias sem revelar valores.
5. Publicar, executar smoke tests e corrigir bloqueadores do piloto.

## Segurança e erros

Erros de validação e autorização devem retornar respostas seguras. Logs não devem incluir senha, cookie, token, corpo clínico sensível ou URL completa de banco. Falhas de conexão devem derrubar o readiness sem expor detalhes internos.

## Critérios de aceite

- `npx prisma validate` e verificação de migrations aprovados;
- backend com typecheck, testes e build aprovados;
- frontend com build aprovado;
- configuração Vercel válida;
- `/health/live` e `/health/ready` retornando `200` no deployment;
- login, persistência de sessão e logout verificados;
- ao menos uma leitura e uma escrita clínica persistindo no Supabase;
- acesso sem sessão rejeitado e RBAC/tenant testados quando houver contas adequadas;
- inspeção final do Git sem `.env` ou segredos;
- commit final enviado ao GitHub e deployment registrado.

## Logo atualizada

A logo enviada pelo proprietário substituirá os assets atuais. A troca manterá proporção, legibilidade, texto alternativo e contraste no login e nos shells autenticados. O build e a verificação visual responsiva serão repetidos após a alteração.

## Rollback

Código será revertível por commit. Mudanças de banco serão aditivas sempre que possível e terão estratégia explícita de rollback. Se o deploy falhar, ele não será promovido até que health checks e smoke tests passem.
