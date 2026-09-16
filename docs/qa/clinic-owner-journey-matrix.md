# BHON — Matriz de Jornada Clínica e Owner

**Status do ciclo:** Em andamento

| ID | Papel | Cenário | Ação | Resultado esperado | Cobertura | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| CLINIC-01 | Clínica | Sessão | Entrar e sair | Login abre o dashboard correto; logout encerra a sessão local mesmo se a rede falhar | `AuthContext.test.tsx` | Pendente de reteste |
| CLINIC-02 | Clínica | Navegação | Abrir cada item da barra | A rota muda sem voltar à visão geral ou perder sessão | `App.test.tsx` | Em auditoria |
| CLINIC-03 | Clínica | Agenda | Carregar, filtrar e abrir atendimento | Dados, estado vazio e erro são distinguíveis; o prontuário é aberto na rota correta | `AgendaPage.test.tsx` | Em auditoria |
| CLINIC-04 | Clínica | Pacientes | Buscar, cadastrar e abrir ficha | Lista preserva filtros; cadastro leva ao prontuário criado | `PatientsPage.test.tsx` | Em auditoria |
| CLINIC-05 | Clínica | Recuperação | Abrir acompanhamento e revisar mensagem | Campos legíveis e mensagem só abre WhatsApp após revisão explícita | `FollowUpsPage.test.tsx`, `RecoveryQueue.test.tsx` | Pendente |
| CLINIC-06 | Clínica | Orçamentos e tratamentos | Abrir, alterar e aprovar | Alteração deixa trilha operacional e não duplica lançamentos | testes de fluxo | Pendente |
| CLINIC-07 | Clínica | Equipe e configurações | Visualizar e editar ações permitidas | Formulários preservam contraste e respeitam permissões | testes de página | Pendente |
| CLINIC-08 | Clínica | Responsividade | Usar a 390px em claro e escuro | Sem corte de conteúdo, rolagem horizontal da página ou texto ilegível | inspeção visual | Pendente |
| OWNER-01 | Owner | Navegação | Abrir clínicas, assinaturas, financeiro, receita, clientes, usuários, suporte, indicadores e configurações | Cada rota carrega sua tela real, não placeholder | `App.test.tsx` | Em auditoria |
| OWNER-02 | Owner | Clínicas | Listar e abrir dossiê | Filtros e dossiê mantêm o contexto da plataforma | testes de rota | Pendente |
| OWNER-03 | Owner | Suporte | Ver e atualizar chamado | Estado correto é exibido com confirmação e feedback | `PlatformSupportPage` testes | Pendente |
