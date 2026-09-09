# BHON Operação Clínica Real

## Intenção

Concluir a transição da área clínica para uma operação premium, confiável e baseada em dados reais. A entrega preserva o conceito Atelier Clínico e elimina as últimas superfícies clínicas que ainda apresentam números, ambientes ou confirmações demonstrativas.

## Abordagem escolhida

A implementação será incremental e orientada pela fonte de verdade já existente. A API Fastify e o PostgreSQL continuam responsáveis por autenticação, regras, agregações e persistência; o React passa a consumir contratos pequenos por página. O contexto operacional legado permanece apenas nos módulos ainda não incluídos nesta entrega, sem ser ampliado.

Uma remoção total do contexto legado foi descartada nesta etapa porque aumentaria o risco ao misturar os módulos clínicos prioritários com a administração da plataforma. Uma troca apenas visual também foi descartada porque manteria métricas inventadas e configurações sem persistência.

## Autenticação e logout

O logout deve ser idempotente e seguro em requisições concorrentes. A sessão autenticada será revogada com uma atualização condicional que não falha quando outra requisição já a revogou. O cookie será removido com os mesmos atributos de escopo usados na criação. Falhas de auditoria continuam não bloqueantes e nenhum token ou dado sensível será registrado.

## Indicadores reais

A página de Indicadores consumirá um endpoint agregado por período. O backend calculará, dentro do `tenantId` da sessão:

- comparecimento a partir de consultas concluídas e faltas;
- ocupação a partir dos minutos agendados e da capacidade das salas ativas;
- conversão a partir de orçamentos aceitos e encerrados;
- abandono a partir de tratamentos abandonados e encerrados;
- ticket médio a partir dos valores finais de orçamentos aceitos;
- tratamentos ativos, receita liquidada e produtividade por profissional.

Quando o denominador não existir, a interface mostrará ausência de base suficiente, nunca uma porcentagem inventada. Os períodos Hoje, Semana e Mês terão limites calculados no fuso clínico. O período personalizado ficará identificado como ainda não configurado até existir um seletor completo de datas.

## Configurações e ambientes

A página de Configurações exibirá somente os dados institucionais vindos da sessão e as salas persistidas. A gestão de ambientes permitirá criar, editar, ordenar e ativar ou desativar salas, com RBAC para proprietário, administrador e gestor. Salas vinculadas a agendamentos não serão apagadas; serão desativadas para preservar o histórico.

As demais seções de configuração que ainda não possuem modelo persistente apresentarão um estado honesto de módulo não configurado, sem mensagens falsas de sucesso, CNPJ, endereço, telefone ou integrações inventadas.

## Experiência e sistema visual

O conceito Atelier Clínico permanece silencioso, editorial e operacional. A evolução inclui:

- entrada suave de páginas e listas com `opacity` e `transform`;
- feedback tátil discreto em ações e estados de carregamento;
- respeito integral a `prefers-reduced-motion`;
- navegação, foco visível e alvos de toque consistentes;
- layouts fluidos em 375, 768, 1366 e 1920 px;
- estados vazios e erros acionáveis;
- carregamento de rotas sob demanda para reduzir o bundle inicial.

Animações não devem atrasar tarefas clínicas nem competir com o conteúdo.

## Dados e segurança

- Toda consulta e mutação deve usar o `tenantId` resolvido pela sessão.
- Nenhuma credencial, cookie, URL de banco ou valor de ambiente entra no repositório ou nos logs.
- Nenhum paciente, notificação, movimento financeiro ou métrica fictícia será criado em produção.
- O primeiro ambiente clínico poderá ser cadastrado como configuração real da clínica.
- Testes de paciente e agendamento usam banco descartável ou contratos automatizados; não criam registros falsos em produção.
- As permissões públicas do Supabase não serão ampliadas; o backend continua sendo a única fronteira de dados da aplicação.

## Testes e publicação

A entrega exige regressões do logout, contratos de salas e indicadores, testes completos do backend, build TypeScript do frontend, revisão pelas diretrizes de interface da Vercel, auditoria responsiva e acessível no navegador, health checks e smoke test de produção. Somente após essas verificações as mudanças serão enviadas à `main`, permitindo o deploy conectado à Vercel.

## Critérios de aceitação

- logout concorrente não retorna 500 e invalida a sessão;
- Equipe, Indicadores e Configurações não dependem de dados demonstrativos;
- nenhuma métrica clínica ou mensagem de persistência é simulada;
- uma sala real pode ser criada e administrada com segurança;
- paciente e agendamento possuem regressões completas sem contaminar produção;
- interface permanece fluida e utilizável nos quatro viewports definidos;
- teclado, foco, labels, modais e contraste passam pela revisão;
- backend, frontend, health checks e smoke test terminam sem regressões antes do push.
