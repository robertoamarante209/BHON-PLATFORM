# Retomada — prontidão operacional da clínica

## Objetivo e decisões do usuário

Concluir o escopo aprovado em `docs/superpowers/specs/2026-09-15-clinic-readiness.md` e `docs/superpowers/plans/2026-09-15-clinic-readiness.md`, validar o sistema integralmente e só então publicar em GitHub, Supabase e Vercel.

Decisões que não devem ser alteradas na retomada:

- o dashboard da clínica não deve exibir Integrações;
- Integrações existem apenas para `PLATFORM_OWNER`;
- não iniciar novas integrações externas antes de a plataforma atual estar 100% validada;
- disponibilidade serve para cadastro/configuração nesta etapa e não deve bloquear a agenda;
- preservar isolamento entre clínicas, permissões e auditoria;
- usar o fluxo Superpowers, com revisão independente e evidência antes de concluir.

## Estado salvo

Branch local: `fix/clinic-readiness`.

Commits desta entrega, em ordem:

1. `d97d654` — escopo e plano aprovados;
2. `678bcc0`, `1711ea3`, `0bdb04c`, `be11d3c` — sessão, autenticação, cabeçalho móvel e isolamento de Integrações;
3. `e2f0c5e`, `619b89b`, `0236750` — disponibilidade, protocolos e correções da revisão;
4. `a6de768` — criação/aprovação segura de orçamentos e correções das jornadas operacionais.

Task 1 passou na revisão independente. Task 2 passou na revisão independente após os ajustes. Task 3 foi implementada e testada, mas ainda precisa da revisão independente prevista pelo processo. Depois disso, ainda falta a revisão final do conjunto.

O worktree estava limpo no momento deste documento, exceto pelo próprio documento até ser commitado. Os arquivos transitórios `backend/pnpm-lock.yaml` e `backend/pnpm-workspace.yaml` foram removidos e não pertencem ao projeto.

## Evidências já obtidas

- frontend: 59/59 testes aprovados;
- backend: 64 aprovados, 0 falhas, 1 teste PostgreSQL opt-in ignorado na suíte normal;
- teste PostgreSQL real da Task 3: aprovado, incluindo criação monetária exata, auditoria, permissão, isolamento de tenant e concorrência de dois orçamentos do mesmo paciente (`200 + 409`, um tratamento e um recebível);
- TypeScript/backend: aprovado;
- build de produção/frontend: aprovado, 1606 módulos;
- verificação de migrations: 11/11 aprovada;
- Task 1: smoke HTTP confirmou Integrações `401` anônimo, `403` para perfis de clínica e `200` apenas para `PLATFORM_OWNER`;
- Task 2: jornada HTTP descartável confirmou cadastro de disponibilidade e protocolos, conflitos de versão, permissões e isolamento entre clínicas;
- visual móvel de 375 px da Task 1 verificado.

Relatórios detalhados:

- `.superpowers/sdd/2026-09-15-clinic-readiness/task-1-report.md`
- `.superpowers/sdd/2026-09-15-clinic-readiness/task-2-report.md`
- `.superpowers/sdd/2026-09-15-clinic-readiness/task-3-report.md`

## Publicação e infraestrutura

GitHub: `robertoamarante209/BHON-PLATFORM`.

- A branch remota `fix/clinic-readiness` já contém a documentação e a Task 1 até o commit remoto `2b7a829d7075dc72e086dc18ea74af6079536674`.
- Os commits locais de Task 2, Task 3 e este handoff ainda precisam ser publicados como novo checkpoint da mesma branch.
- O `git push` do shell não tem autenticação utilizável; continuar pela conexão GitHub da aplicação, criando a árvore completa e atualizando a branch sem force.
- `main` não foi alterada e não deve ser mesclada antes das revisões e da validação final.

Supabase: projeto `pngxrwsvnqghloebbbba`.

- Produção está saudável.
- As tabelas `clinic_availability` e `clinic_protocols` ainda não existem em produção.
- A migration aditiva `backend/prisma/migrations/20260915120000_clinic_configuration/migration.sql` foi validada localmente, mas ainda não foi aplicada em produção.
- Aplicar somente depois da revisão final e depois inspecionar tabelas, RLS, privilégios e advisors.
- Não executar `prisma migrate deploy` diretamente: o histórico `_prisma_migrations` não coincide integralmente com o histórico gerenciado do Supabase.

Vercel: equipe `team_uhMQ9kLQ0ADZ9FgJzHrbOmyL`, projeto `prj_fSVbC7wGCYwBpx9u0LKyMKNoEJuF`.

- Produção atual continua no `main` anterior (`fdb70ec`).
- O preview disparado pela Task 1 falhou depois do build porque o Container Registry atingiu o número máximo de imagens: deployment `dpl_Gzy7mBPchh7tw7u32DnFuNpbr2Mr`.
- A remoção de imagens antigas exige inventário autenticado no painel/CLI e confirmação do alvo exato. O login Vercel via GitHub parou na tela de credenciais; não pedir nem manipular senha do usuário.
- Preservar a imagem usada pela produção. Só apagar imagens antigas identificadas e confirmadas, então refazer o preview.

## Ordem exata para continuar

1. Confirmar `git status` e publicar este checkpoint na branch remota do GitHub.
2. Fazer revisão independente da Task 3, cobrindo domínio monetário, rota, permissões, auditoria, concorrência, UI e testes.
3. Encaminhar qualquer finding ao implementador original, testar e revisar novamente até PASS.
4. Fazer revisão independente de toda a branch contra a especificação aprovada.
5. Rodar novamente as suítes completas, builds, verificação de migrations e jornada HTTP real ponta a ponta: paciente → agenda → status → orçamento → aprovação concorrente → tratamento → recebível/pagamento.
6. Verificar no navegador desktop e móvel as telas de Configurações, Orçamentos, Estoque e Documentos, sem erros de console.
7. Publicar o código final na branch GitHub e abrir PR.
8. Resolver com o usuário o acesso autenticado ao Vercel e o espaço do registry; gerar preview READY e validar saúde/logs.
9. Aplicar a migration aditiva no Supabase e verificar segurança/estrutura.
10. Somente com preview, banco e revisões verdes, mesclar o PR em `main`, acompanhar produção e executar smoke pós-deploy.

Não declarar o sistema 100% concluído antes dos passos 2–10.
