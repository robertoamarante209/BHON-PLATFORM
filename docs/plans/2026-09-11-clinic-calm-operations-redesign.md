# BHON — Redesign Calma Operacional

## Entendimento

- Reconstruir integralmente a experiência clínica, sem reutilizar a composição visual atual.
- Atender clínicas de todas as especialidades, removendo linguagem exclusivamente odontológica.
- Facilitar jornadas longas de trabalho com uma interface calma, confiável e pouco cansativa.
- Priorizar agenda, pacientes, equipe e recuperação comercial, reduzindo indicadores decorativos.
- Oferecer experiência totalmente responsiva e funcional em desktop, tablet e celular.
- Permitir que a clínica crie logins de funcionários com permissões individuais por ação.
- Adiar integrações externas até a aprovação visual integral desta etapa.

## Direção visual

**Nome:** Calma Operacional

Base cinza-clara aquecida, superfícies brancas suaves, texto carvão e teal reservado para ação, seleção e sucesso. Alertas semânticos aparecem apenas quando exigem atenção. Manrope permanece como tipografia principal, com menos caixa alta, densidade controlada e espaços usados para criar hierarquia.

**Âncora de diferenciação:** linha temporal contínua da agenda, conectando profissionais, pacientes e estado da operação sem depender de uma coleção de cartões genéricos.

**DFII subjetivo:** 16/19 — impacto 4, adequação 5, viabilidade 5, segurança de desempenho 5, risco de consist 3.

## Arquitetura de informação

Navegação principal:

1. Hoje
2. Agenda
3. Pacientes
4. Recuperação
5. Gestão

O dashboard inicial apresenta primeiro a agenda. Filas de confirmação, atrasos e recuperação comercial aparecem abaixo, em formato compacto. Financeiro, indicadores e administração permanecem em áreas específicas.

## Agenda

- Visualização padrão diária.
- Horários em linhas e profissionais em colunas.
- Linha de horário atual.
- Cartões contendo apenas paciente, horário, tipo de atendimento e status.
- Detalhes e comandos em painel lateral.
- Filtros por profissional, especialidade, unidade e status.
- No celular, lista cronológica agrupada por profissional.

## Pacientes

- Busca como ação dominante e filtros discretos.
- Tabela no desktop e cartões no celular.
- Cadastro progressivo em: essencial, contato, clínico e origem.
- Linguagem multiespecialidade.
- Prevenção de duplicidade por documento, telefone ou e-mail.
- Ficha unificada com histórico, agenda, documentos, tratamentos, pagamentos e contatos.

## Equipe e acesso

- Criação, suspensão e reativação de logins pela clínica.
- Permissões individuais por módulo e ação: visualizar, criar, editar, excluir, exportar e executar ações financeiras.
- Validação de autorização no servidor.
- Um usuário nunca pode conceder privilégios superiores aos próprios.
- Auditoria das mudanças sensíveis.

## Recuperação comercial

Cada item mostra orçamento, paciente, valor, tempo sem contato, responsável, última tentativa e próxima ação. A equipe pode registrar contato, reagendar, converter ou encerrar. O início exibe apenas prioridades; o funil completo permanece na área Recuperação.

## Requisitos não funcionais

- Layouts validados de 320 a 1440 pixels, sem rolagem horizontal da página.
- Componentes reutilizáveis e tokens CSS centralizados.
- Navegação por teclado, foco visível, contraste e redução de movimento.
- Isolamento entre clínicas e autorização aplicada no backend.
- Estados de carregamento, vazio, erro e repetição segura de ações.
- Desempenho adequado para uso diário prolongado e crescimento planejado.

## Estratégia de testes

- Testes de componentes e fluxos antes da implementação correspondente.
- Agenda: carregar, filtrar, criar, selecionar e alterar atendimento.
- Pacientes: cadastrar, validar, buscar e abrir ficha.
- Equipe: criar login e aplicar permissões individuais.
- Recuperação: priorizar e registrar desfecho.
- Verificação visual e interativa em desktop e mobile no navegador.
- Build de produção, suíte completa e smoke test no domínio oficial.

## Registro de decisões

| Decisão | Alternativas | Motivo |
| --- | --- | --- |
| Calma Operacional | Minimalismo executivo; painel analítico | Suporta uso prolongado sem perder personalidade. |
| Agenda diária por profissional | Semana; dia por sala | Corresponde melhor à coordenação da equipe clínica. |
| Permissões individuais | Perfis prontos | Entrega controle total à clínica. |
| Informação progressiva | Todos os campos e métricas visíveis | Reduz carga cognitiva. |
| Produto multiespecialidade | Foco odontológico | Amplia o mercado e evita termos restritivos. |
| Integrações após aprovação | Desenvolvimento simultâneo | Evita consolidar integrações sobre uma experiência ainda não aceita. |

## Riscos reconhecidos

- Permissões individuais aumentam complexidade de interface e testes.
- A grade por profissional precisa funcionar com equipes grandes sem comprometer legibilidade.
- Dados legados odontológicos devem ser neutralizados sem quebrar registros existentes.
- A validação estética final depende da revisão do proprietário em dados e dispositivos reais.
