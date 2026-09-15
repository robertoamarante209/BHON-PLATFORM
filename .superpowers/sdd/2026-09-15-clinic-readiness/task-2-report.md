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
