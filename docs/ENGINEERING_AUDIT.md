# BHON — Auditoria de engenharia e produto

Data: 2026-09-06  
Base auditada: `3a47633` (`main`)

## A. Arquitetura atual

A BHON está organizada como dois projetos independentes. O frontend é uma SPA React 18 + Vite + TypeScript, com Wouter, Tailwind e um grande `OperationalDataContext`. O backend é uma API Fastify 5 + Prisma 7 + PostgreSQL. O banco já modela os principais domínios clínicos, a operação da plataforma, sessões, notificações, timeline e auditoria.

A documentação ainda descreve Next.js, NestJS, Redis, BullMQ, Docker e Azure, mas esses componentes não existem na implementação atual. Hoje a arquitetura executável é Vite/React + Fastify + PostgreSQL.

## B. O que já está correto

- Autenticação real por senha com bcrypt (12 rounds) e sessão persistida no PostgreSQL.
- Token de sessão criptograficamente aleatório; somente SHA-256 do token é salvo no banco.
- Cookie HttpOnly, `SameSite=Lax` e `Secure` em produção; o token não volta no JSON.
- Sessões expiradas/revogadas, usuários bloqueados e clínicas suspensas/canceladas são rejeitados.
- RBAC explícito nas rotas clínicas e separação inicial entre clínica e `PLATFORM_OWNER`.
- Filtros de tenant já estão presentes nos principais acessos clínicos.
- Criação de paciente usa sequência atômica por tenant.
- Aprovação de orçamento e liquidação de pagamento usam transações e propagam efeitos relacionados.
- Mudança de agendamento para falta cria acompanhamento, timeline e notificação.
- Schema possui relacionamentos, chaves estrangeiras e índices úteis para os acessos atuais.
- A direção visual existente já usa Navy, Teal, tipografia funcional e sidebar escura.

## C. Riscos técnicos críticos

- O frontend mantém uma segunda aplicação completa dentro do navegador: dados, regras de negócio, auditoria, notificações e persistência são duplicados em `localStorage`.
- O backend concentra quase todo o domínio em um único arquivo de rotas, com tipos `any`, validação manual e regras difíceis de testar isoladamente.
- Não há uma camada comum de cliente HTTP, tratamento de erro, cache/invalidação ou estados de carregamento para migração progressiva do frontend.
- Algumas reações cruzadas são executadas fora de transação. Uma falha intermediária pode deixar agendamento, acompanhamento, timeline, notificação e auditoria inconsistentes.
- Listagens como orçamentos e pagamentos não possuem paginação, busca ou limites.
- A documentação de arquitetura e roadmap não representa o software executável.

## D. Riscos de segurança

- Login não possui rate limiting nem proteção específica contra credential stuffing.
- Rotas de mutação baseadas em cookie não aplicam uma verificação explícita de origem/CSRF.
- O middleware aceita Bearer token além do cookie, embora o produto não documente uma API de integração.
- Não há schemas consistentes de entrada e saída; vários corpos são convertidos para `any`.
- O endpoint de tenants retorna objetos Prisma sem um contrato explícito de resposta.
- Ausência de testes automatizados para IDOR, escape de tenant, elevação de privilégio, sessão revogada e clínica suspensa.
- Não há arquitetura implementada de recuperação de senha, MFA ou rotação/invalidação global de sessões.
- Dados clínicos sensíveis ainda não têm controles documentados de retenção, acesso, exportação, backup e resposta a incidentes.

## E. Problemas da arquitetura frontend

- `OperationalDataContext.tsx` é um banco paralelo e contém regras clínicas que deveriam existir somente no backend.
- `initialData.ts` alimenta métricas e relações que parecem reais, mas não são provenientes do PostgreSQL.
- Auditoria e timeline criadas no navegador não são confiáveis.
- Assinaturas, faturamento da plataforma, notificações e suporte também são simulados localmente.
- Diversas funções são síncronas e silenciam falhas; as telas não conseguem representar corretamente loading, erro, retry ou conflito.
- Tipos frontend duplicam enums e contratos do backend sem geração ou validação compartilhada.

## F. Lacunas do backend/API

- Não há CRUD/API real para tratamentos, oportunidades, acompanhamentos, equipe, notificações, assinaturas, billing e suporte.
- Agenda não possui endpoint de reagendamento; pacientes não possuem atualização real.
- Não existe fila unificada do Recovery Engine nem comandos completos de concluir, adiar, reatribuir e registrar contato.
- Não existem serviços de domínio ou publicador de eventos para concentrar efeitos cruzados.
- Respostas não seguem envelope/erro consistente, e os endpoints não declaram schemas Fastify.
- O servidor inicia no módulo de composição, dificultando testes com `app.inject()`.

## G. Lacunas do Recovery Engine

- A interface calcula exceções sobre dados locais e usa métricas financeiras fixas.
- O endpoint `/api/overview` agrega algumas exceções reais, mas não entrega prioridade, responsável, idade, próxima ação e estado em um contrato único.
- Não existe registro persistente que conecte sinal, execução, resultado e receita recuperada.
- Não há regras idempotentes para detectar sinais nem rotina programada de detecção.
- Ações executadas não recalculam uma fila real no frontend.

## H. Lacunas de UX e design

| Antes | Depois | Por quê |
| --- | --- | --- |
| Overview com muitos cards equivalentes | Fila operacional dominante, seguida da operação do dia e métricas de apoio | A clínica deve entender o que requer ação em poucos segundos |
| Métricas fixas misturadas a dados locais | Métricas calculadas somente a partir da API | Preserva confiança e evita resultados inventados |
| Botões que apenas navegam ou alteram estado local | Comandos com loading, erro, confirmação e atualização da API | A interface precisa representar execução real |
| Muitas cores semânticas competindo | Navy estrutural, Teal para ação e cores de exceção controladas | Reforça identidade institucional e hierarquia |
| Transições genéricas em todos os hovers | Transições curtas apenas em propriedades relevantes e feedback de pressão | Melhora resposta percebida sem distrair a operação |

O logo aparece na sidebar clínica, mas é necessário auditar também o shell da plataforma para garantir a regra de uma ocorrência no ambiente autenticado.

## I. Banco e migrations

- O schema é amplo e relacional, mas parte dele ainda não possui API correspondente.
- As migrations usam `IF NOT EXISTS`, o que pode esconder drift e produzir bancos estruturalmente diferentes sob o mesmo histórico.
- Regras de pertencimento ao tenant dependem majoritariamente da aplicação; FKs simples não impedem relacionar entidades de tenants diferentes.
- Faltam campos para registrar de forma explícita resultado de recuperação, receita recuperada e conclusão de acompanhamento.
- Índices devem ser revisados junto às consultas reais do Recovery Engine; índices compostos por tenant, estado e prazo serão importantes.
- É necessário validar migration history contra um banco limpo e um banco existente antes de produção.

## J. Lacunas de testes

O backend possui um script de teste que falha por definição e o frontend não possui testes. Não há cobertura automatizada para autenticação, RBAC, tenant isolation, workflows cruzados, contratos HTTP, componentes críticos ou regressão de build.

## K. Ordem recomendada

1. Tornar o backend testável, padronizar validação/erros e cobrir autenticação e tenant isolation.
2. Criar a API real da fila operacional do Recovery Engine e seus comandos transacionais.
3. Introduzir um cliente HTTP tipado no frontend e ligar a Overview à fila real.
4. Migrar Agenda e Pacientes para a API; remover a autoridade local desses domínios.
5. Migrar Tratamentos, Oportunidades, Acompanhamentos, Orçamentos e Financeiro em fatias verticais.
6. Persistir notificações e expor auditoria confiável.
7. Implementar APIs separadas da BHON Platform com autorização própria.
8. Remover o restante do banco paralelo em `localStorage`.
9. Consolidar design system, estados de UX e responsividade após cada domínio real.
10. Validar os sete workflows ponta a ponta e executar auditoria final de segurança e produto.

## Primeiro marco de implementação

O primeiro marco será uma fila operacional real: endpoint agregado por tenant, contrato explícito, métricas derivadas do PostgreSQL e comandos persistentes para acompanhamentos. A Overview passará a consumir essa API antes da migração dos demais módulos.

## Estado após o primeiro marco

- Implementado endpoint tenant-scoped do Recovery Engine com follow-ups, orçamentos, oportunidades, tratamentos e recebíveis.
- Implementados comandos transacionais de registrar contato, concluir, adiar e reatribuir, com timeline, auditoria e notificação.
- Overview conectada à fila real por um cliente HTTP comum e com estados explícitos de loading, erro, vazio e sucesso.
- Aplicado hardening inicial: limitação de login, validação de origem para mutações por cookie e Bearer desabilitado por padrão.
- Adicionados testes das regras de prioridade, exposição financeira, notas auditáveis, origem confiável e rate limiting.

As demais lacunas deste documento continuam abertas e não devem ser consideradas entregues por este marco.

## Estado após o segundo marco

- Pacientes: listagem, busca, cadastro e dossiê passaram a consumir a API; um cadastro novo já abre o prontuário persistido correto.
- Agenda: data, pacientes, salas, profissionais e atendimentos agora vêm do PostgreSQL; IDs e datas fixas foram removidos.
- Criação e reagendamento verificam colisão de sala ou profissional sob lock transacional por tenant.
- Mudanças de status, incluindo falta e conclusão, agora executam todos os efeitos relacionados na mesma transação.
- Overview passou a usar a agenda real e teve métricas fixas e a segunda fila local removidas.
- Vite e o plugin React foram atualizados; `npm audit` do frontend e o build de produção passaram.
- Testes de domínio agora cobrem duração, sobreposição de intervalos e transições de agenda, totalizando 10 testes.

Ainda permanecem pendentes testes HTTP/banco para isolamento multi-tenant e a migração dos demais módulos listados no roadmap.

