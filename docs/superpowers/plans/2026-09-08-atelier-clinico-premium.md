# Plano de implementação — Atelier Clínico Premium

## Objetivo

Entregar a primeira versão visual da central clínica premium sem alterar contratos de API ou regras operacionais.

### Tarefa 1 — Fundações visuais

- Atualizar tokens de cor e tipografia em `frontend/tailwind.config.js` e `frontend/src/index.css`.
- Incluir superfícies, foco visível, textura discreta e utilitários reutilizáveis.
- Executar `npm run build` no frontend.

### Tarefa 2 — Shell premium

- Redesenhar `ClinicLayout`, `Sidebar` e `TopHeader`.
- Agrupar a navegação clínica por intenção e reforçar contexto, data e operação ao vivo.
- Preservar busca, notificações, usuário, logout e rotas existentes.
- Executar `npm run build` no frontend.

### Tarefa 3 — Visão do dia

- Reestruturar `OverviewPage` com abertura editorial, pulso operacional e linha de cuidado.
- Manter carregamento, erros, comandos, transições e reagendamento existentes.
- Executar `npm run build` no frontend.

### Tarefa 4 — Agenda premium

- Harmonizar cabeçalho, controles, grade e estados em `AgendaPage`.
- Preservar criação de consulta, transições, falta, atraso e drawers.
- Executar `npm run build` no frontend.

### Tarefa 5 — Verificação e publicação

- Executar build completo do frontend e suíte completa do backend.
- Validar visualmente login, visão geral e agenda em desktop e viewport móvel.
- Confirmar `health/live`, `health/ready` e sessão sem autenticação em produção.
- Revisar `git diff --check`, confirmar que `.env` não foi incluído, commitar e enviar para `main`.
- Acompanhar o deploy da Vercel e repetir smoke tests.
