# Roadmap verificável da BHON

Atualizado em 6 de setembro de 2026. Um item só recebe **concluído** quando código, persistência e validação correspondente existem no repositório.

## 1. Fundação segura — em andamento

Concluído:

- login e logout com sessões opacas no PostgreSQL;
- cookie HttpOnly, hash de token, expiração e revogação;
- RBAC e contexto multi-tenant;
- proteção de origem para mutações por cookie;
- limitação de tentativas de login;
- auditoria das operações críticas implementadas.

Pendente:

- recuperação de senha, verificação de e-mail e MFA;
- testes HTTP de sessão, RBAC, IDOR e isolamento multi-tenant;
- gestão de segredos, observabilidade e resposta a incidentes.

## 2. Recovery Engine — fundação concluída

- fila agregada por tenant com follow-ups, orçamentos, oportunidades, tratamentos e recebíveis;
- prioridade, idade, responsável, prazo, próxima ação e exposição financeira;
- registrar contato, concluir, adiar e reatribuir follow-up;
- timeline, auditoria e notificação na mesma transação;
- Overview consumindo a fila persistida.

Próximo: persistir resultados e receita efetivamente recuperada, além de automatizar a detecção idempotente de sinais.

## 3. Pacientes e Agenda — núcleo conectado

Concluído:

- listagem, busca e cadastro de pacientes pela API;
- dossiê carregado do PostgreSQL;
- agenda diária, salas e profissionais carregados da API;
- criação, status e reagendamento persistidos;
- conflitos de sala/profissional serializados por tenant;
- efeitos de falta e conclusão executados transacionalmente.

Pendente:

- edição cadastral na interface, importação e deduplicação;
- paginação navegável e busca remota de pacientes na agenda;
- recorrência, bloqueios de agenda, fusos configuráveis e testes de integração com PostgreSQL.

## 4. Próxima fatia: Tratamentos e Orçamentos

- migrar telas para API e remover sua autoridade no `OperationalDataContext`;
- completar CRUD, etapas clínicas e transições válidas;
- ligar aprovação de orçamento → tratamento → recebível → oportunidade;
- cobrir idempotência e rollback com testes de integração.

## 5. Oportunidades, Follow-ups e Financeiro

- substituir dados locais pelos registros persistidos;
- registrar resultados operacionais estruturados;
- conciliar pagamentos e lançamentos financeiros;
- calcular conversão, continuidade e receita recuperada sem valores fixos.

## 6. Operação da plataforma BHON

- APIs exclusivas para clínicas, assinaturas, faturas e suporte;
- autorização própria de `PLATFORM_OWNER`;
- suspensão e reativação auditadas;
- integração com provedor real de billing.

## 7. Produção e escala

- remover o restante do `localStorage` operacional;
- testes unitários, integração, componentes e fluxos ponta a ponta;
- CI obrigatório, migrations testadas em banco limpo e upgrade;
- métricas, logs estruturados, tracing e alertas;
- backup/restauração, retenção e controles LGPD;
- filas/workers apenas para tarefas assíncronas reais;
- revisão final de segurança, acessibilidade, responsividade e performance.

