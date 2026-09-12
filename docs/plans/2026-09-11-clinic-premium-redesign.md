# BHON — Clínica Premium Operacional

## Decisões aprovadas

- Ambiente clínico claro, clean e acolhedor, com off-white, branco, carvão e teal.
- Agenda é o primeiro bloco e a principal ação diária.
- Recuperação de orçamentos frios é o segundo bloco e o diferencial comercial central.
- Gestão de funcionários permanece como módulo operacional com cadastro e permissões.
- Navegação responsiva: lateral expandida no desktop e barra inferior no celular.
- A marca oficial usa o símbolo orgânico e o lockup BHON em SVG transparente.
- Integrações ficam fora desta etapa e só começam após aprovação visual integral.

## Referências funcionais

- Agendart: agenda por ambientes, profissionais, status, comunicação e prevenção de faltas.
- JDP.MED: organização de sistema operacional clínico e hierarquia direta.

## Requisitos não funcionais

- Preservar isolamento por clínica e permissões existentes.
- Manter carregamento progressivo, listas eficientes e redução de movimento.
- Garantir navegação por teclado, contraste e alvos móveis adequados.
- Não expor segredos ou alterar arquivos de ambiente.

## Ordem vinculante

1. Concluir e validar integralmente o novo dashboard e todas as telas internas.
2. Apresentar o produto para aprovação visual do fundador.
3. Somente após aprovação explícita de 100%, iniciar integrações externas.

Integrações como WhatsApp, Stripe e provedores de login permanecem fora desta fase. Nesta entrega, suas áreas podem comunicar o estado futuro e oferecer fluxos locais seguros, mas não podem simular conexão real.

## Tarefas de implementação

### Task 1: Baseline e matriz de lacunas

- Verificar build, typecheck e testes existentes de frontend e backend.
- Inventariar todas as rotas e ações de navegação.
- Classificar problemas em P0, P1 e P2 com evidência reproduzível.
- Registrar o critério de aceite de cada tela antes de alterá-la.

### Task 2: Autenticação, sessão e permissões

- Impedir que falhas transitórias e ações internas válidas devolvam o usuário ao login.
- Preservar a rota pretendida após autenticação.
- Garantir separação entre owner da plataforma e usuários de clínicas.
- Validar permissões por módulo e ação também no servidor.
- Manter isolamento obrigatório por clínica em todas as consultas de negócio.

### Task 3: Shell clínico e navegação responsiva

- Unificar estrutura, tipografia, espaçamento, estados e navegação de todas as telas clínicas.
- Desktop com navegação lateral; mobile com barra inferior e menu complementar.
- Garantir foco visível, teclado, contraste, alvos de toque e redução de movimento.
- Remover links mortos e páginas que pareçam placeholders não intencionais.

### Task 4: Hoje e Visão Geral

- Transformar a entrada da clínica em resumo operacional do dia.
- Priorizar agenda, pacientes aguardando confirmação e ações de recuperação.
- Mostrar potencial recuperável sem excesso de cartões ou gráficos decorativos.
- Oferecer próximas ações claras, estados vazios e tratamento de falha de rede.

### Task 5: Agenda inteligente

- Organizar profissionais, horários, ambientes e atendimentos com baixa poluição visual.
- Permitir criação, edição, confirmação, reagendamento, falta, cancelamento e conclusão.
- Prevenir conflitos de profissional, sala e horário.
- Exibir lista cronológica no mobile sem rolagem horizontal.

### Task 6: Pacientes e importação

- Centralizar histórico, agenda, documentos, tratamentos, pagamentos e contatos.
- Implementar pesquisa, filtros, cadastro, edição e prevenção de duplicidade.
- Preparar importação de planilha com mapeamento, prévia, validação e relatório de erros.
- Manter os campos clínicos neutros para múltiplas especialidades.

### Task 7: Recuperação, CRM, orçamentos e comunicação

- Unificar oportunidades, faltas, tratamentos interrompidos, orçamentos frios e follow-ups.
- Priorizar por valor, tempo sem contato, responsável e próxima ação.
- Permitir registrar contato, reagendar, converter ou encerrar com histórico auditável.
- Preparar mensagens editáveis e ação de WhatsApp sem afirmar integração ativa antes da aprovação.

### Task 8: Financeiro, estoque e documentos

- Entregar visão operacional de entradas, saídas, pagamentos e resultados.
- Entregar estoque com produtos, movimentações e alertas relevantes.
- Entregar documentos com organização, busca e vínculo opcional ao paciente.
- Garantir estados vazios, erros, carregamento e permissões adequadas.

### Task 9: Equipe e configurações

- Permitir criar, suspender e reativar membros da equipe.
- Configurar acesso por módulo e ações de visualizar, criar, editar, excluir, exportar e operar finanças.
- Impedir escalada de privilégios e registrar alterações sensíveis.
- Organizar configurações da clínica sem misturar preferências pessoais e administrativas.

### Task 10: Indicadores e owner da plataforma

- Transformar dados da clínica em decisões, com período, definição e contexto claros.
- Evitar métricas sem ação e visualizações decorativas.
- Manter o owner visualmente coerente com a BHON, mas funcionalmente separado da clínica.
- Validar que nenhuma ação do owner vaze ou confunda o tenant ativo.

### Task 11: Validação integral e preview

- Executar suites automatizadas, build e typecheck.
- Testar como usuário real todas as rotas e ações críticas em desktop, tablet e mobile.
- Verificar teclado, foco, contraste, carregamento, vazio e falha de rede.
- Verificar logs de runtime, migrações e advisors de segurança/performance.
- Publicar preview na Vercel somente após os gates anteriores passarem.
- Não promover para produção sem aprovação explícita do fundador.

## Critério de conclusão desta fase

A fase termina quando não houver P0 aberto; todos os P1 que impedem uso diário estiverem resolvidos; todas as rotas declaradas forem acessíveis e funcionais; os testes críticos forem reproduzíveis; e a versão de preview estiver pronta para aprovação visual. “Sem bugs” não será alegado sem evidência: limitações e integrações adiadas serão listadas explicitamente.
