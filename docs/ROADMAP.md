# Roadmap verificável da BHON

Atualizado em 7 de setembro de 2026. Um item só recebe **concluído** quando código, persistência e validação correspondente existem no repositório.

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
- testes HTTP de RBAC autenticado, IDOR e isolamento multi-tenant;
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

## 4. Tratamentos e Orçamentos — núcleo conectado

Concluído:

- telas de listagem, busca, filtros, paginação e dossiê consumindo APIs persistidas;
- métricas de orçamento calculadas no backend, sem metas ou deltas fictícios;
- transições explícitas de tratamento e etapas, com atualização transacional do progresso;
- timeline e auditoria das mudanças clínicas;
- aprovação serializada de orçamento → oportunidade → tratamento → etapas → recebível;
- autorização separada para leitura, operação clínica e aprovação gerencial;
- testes unitários das máquinas de estado e do cálculo de progresso.

Pendente:

- criação e edição completas de orçamento e tratamento pela interface;
- reagendamento de datas das etapas e atribuição de responsável;
- testes de integração com PostgreSQL para concorrência, idempotência e rollback;
- emissão, aceite externo e assinatura digital de propostas.

## 5. Oportunidades, Follow-ups e Financeiro — núcleo conectado

Concluído:

- funil e fila dedicada agora usam registros persistidos, busca remota, filtros e paginação;
- potencial ativo, contagens por estágio e acompanhamentos vencidos são calculados no servidor;
- transições de oportunidade seguem máquina de estados e conversão exige aprovação do orçamento;
- contatos exigem registro objetivo e conclusões exigem desfecho estruturado;
- concluir, contatar, adiar e reatribuir follow-up atualizam domínio, timeline e auditoria;
- ações concorrentes no mesmo follow-up são serializadas;
- links com `focus` abrem o acompanhamento correto a partir do Recovery Engine;
- controles da interface respeitam perfis somente leitura.
- recebíveis, métricas e filtros financeiros são calculados no backend e paginados;
- baixas parciais e integrais criam recibos imutáveis, atualizam saldo/status e registram timeline e auditoria na mesma transação;
- ações financeiras concorrentes são serializadas, bloqueando sobrepagamento;
- tela financeira responsiva consome somente a API e respeita perfis de leitura e operação.

Pendente:

- implementar conciliação bancária e estornos auditados;
- persistir atribuição financeira de receita recuperada por contato;
- completar criação/edição de oportunidades e follow-ups;
- testes HTTP/PostgreSQL de concorrência, RBAC e isolamento multi-tenant.

## 6. Operação da plataforma BHON

- APIs exclusivas para clínicas, assinaturas, faturas e suporte;
- autorização própria de `PLATFORM_OWNER`;
- suspensão e reativação auditadas;
- integração com provedor real de billing.

## 7. Produção e escala

- configuração inicial Vercel Services + Supabase e health checks implementados; falta validar o primeiro deployment real;
- remover o restante do `localStorage` operacional;
- testes unitários, integração, componentes e fluxos ponta a ponta;
- CI versionado para Prisma, typecheck, testes e builds; falta torná-lo obrigatório via proteção da branch e testar migrations em banco limpo/upgrade;
- métricas, logs estruturados, tracing e alertas;
- backup/restauração, retenção e controles LGPD;
- filas/workers apenas para tarefas assíncronas reais;
- revisão final de segurança, acessibilidade, responsividade e performance.

