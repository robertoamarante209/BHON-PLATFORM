# Task 2 — Disponibilidade e protocolos reais

## Resultado

- Disponibilidade semanal da clínica e de profissionais produtivos, com múltiplos intervalos, pausas, dias fechados e distinção entre não configurado e semana fechada.
- O registro é informativo e não participa da criação ou edição de agendamentos.
- Edição usa versão otimista; gravações antigas recebem `409 VERSION_CONFLICT`.
- Protocolos definidos pela clínica podem ser criados, editados, desativados e reativados, preservando histórico e ordem das etapas.
- Permissões preservam OWNER e gestor legado; usuários com permissões explícitas precisam de `team.manage`. Leituras usam `agenda.view` ou `patients.view`.
- Novas tabelas têm escopo por tenant, índices, chaves estrangeiras, RLS habilitado e privilégios Data API revogados.

## TDD e validação

- RED: testes de domínio foram escritos antes das funções e falharam por módulos ausentes; testes de componentes falharam antes dos editores.
- Domínio backend: 10/10 aprovados para horários, sobreposição, semana fechada, permissões e limites de protocolo.
- Backend completo: 57/57 aprovado; TypeScript aprovado.
- Migrations: todas aplicadas em PostgreSQL PGlite descartável, incluindo `20260915120000_clinic_configuration`. O verificador mantém os dois campos Google preexistentes como extras conhecidos.
- Frontend completo: 52/52 aprovado; TypeScript e build Vite aprovados.
- Jornada HTTP em PostgreSQL descartável: persistência, semana fechada, escopo profissional, permissão, isolamento de tenant e conflitos de versão aprovados.

## Limites

- Fixtures da jornada existem somente no ambiente descartável fora do repositório.
- A migration de produção será aplicada pelo processo de publicação após revisão independente e antes do deploy.

## Fix round 1 — revisão independente

- RED: `vitest run Sidebar.test.tsx ConfigurationPanels.test.tsx ProtocolEditor.test.tsx` — 3 falhas esperadas: gestor legado sem acesso correto, troca de escopo mantendo dados antigos e erro de toggle sem tratamento.
- GREEN: o mesmo comando — 10/10 testes aprovados.
- Backend focado: 13/13 aprovados, incluindo autenticação do novo `GET /api/settings/availability/professionals`.
- Backend completo: 63/64; a única falha é o teste de runtime que executa TypeScript e encontra erro em `src/domain/budget.ts`, arquivo concorrente e fora do Task 2.
- Frontend completo: 57 testes aprovados; uma suíte concorrente de Task 3 não carrega porque `BudgetEditor.tsx` ainda não existe.
- Corrigido: navegação usa a política específica de configuração; gestor legado vê Configurações sem administração de Equipe, e permissão explícita continua exigindo `team.manage`.
- Corrigido: profissionais produtivos ativos são listados por endpoint mínimo, tenant-scoped, sem depender de `team.view`.
- Corrigido: mudança de escopo limpa a disponibilidade anterior, aborta/vincula a resposta ao escopo e oculta o editor após erro.
- Corrigido: criar/editar/desativar/reativar protocolo usa trava de salvamento e apresenta conflito/erro acionável sem rejeição não tratada.
