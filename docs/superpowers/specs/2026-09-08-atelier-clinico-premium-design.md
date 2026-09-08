# BHON — Atelier Clínico Premium

## Intenção

Transformar a área clínica em uma central privada de alta confiança. A interface deve transmitir cuidado, precisão e controle sem lembrar um painel SaaS genérico.

## Direção aprovada

O conceito visual é **Atelier Clínico**: azul profundo como arquitetura, marfim quente como superfície, verde BHON usado como assinatura e tipografia editorial para criar uma presença mais humana. A agenda operacional do dia é o centro da experiência; métricas financeiras e administrativas permanecem disponíveis, porém em segundo plano.

## Hierarquia da experiência

1. O primeiro olhar responde como está a clínica agora.
2. A linha do dia apresenta pacientes, horários e estado de atendimento como uma jornada contínua.
3. Exceções e pendências aparecem como atenção clínica, não como alertas de software.
4. Comandos permanecem próximos do contexto do paciente.
5. Navegação extensa é organizada em núcleos: Cuidado, Relacionamento e Gestão.

## Sistema visual

- Azul noite `#0E1A2B` para navegação e áreas de autoridade.
- Marfim clínico `#F4F1EA` no plano de fundo, evitando o branco azulado típico de dashboards.
- Verde mineral `#18A896` como assinatura e estado ativo.
- Dourado discreto `#B79A63` apenas para detalhes de hospitalidade e prioridade.
- Manrope permanece na interface; títulos ganham uma família serifada editorial.
- Bordas mais suaves, raios controlados e sombras profundas, sem excesso de cartões flutuantes.
- Números e horários continuam usando IBM Plex Mono para precisão operacional.

## Shell clínico

- Sidebar mais estreita, com marca limpa, clínica ativa e navegação agrupada.
- Cabeçalho passa a atuar como concierge: saudação contextual, data, busca e estado da operação.
- Conteúdo recebe mais respiro horizontal e fundo marfim com textura sutil feita em CSS.
- Responsividade preserva acesso às ações principais em telas menores.

## Visão do dia

- Abertura editorial com saudação e resumo da clínica.
- Painel principal escuro apresenta o pulso do dia, progresso e próxima decisão.
- Indicadores deixam de parecer cartões idênticos e viram uma faixa operacional integrada.
- Agenda é apresentada como uma linha de cuidado, com hierarquia visual por horário, paciente e estado.
- Fila de recuperação permanece funcional, posicionada como exceção após a operação do dia.

## Agenda

- Controles de data e novo agendamento ganham linguagem premium e melhor hierarquia.
- Grade de horários recebe superfícies contínuas e legibilidade clínica.
- Drawers e ações mantêm o comportamento atual; apenas a camada visual será harmonizada.

## Restrições

- Nenhum fluxo de dados ou regra clínica será removido.
- Contraste, foco visível e navegação por teclado devem ser preservados.
- O logotipo aparece somente nos pontos de marca previstos.
- A primeira entrega cobre shell, visão geral e agenda; demais páginas herdam tokens e shell antes de refinamento específico.

## Critérios de aceitação

- A primeira dobra parece uma central clínica, não um dashboard SaaS.
- A agenda e o estado atual da operação dominam a hierarquia.
- A interface mantém build TypeScript limpo e rotas existentes.
- Desktop e viewport móvel não apresentam overflow estrutural.
- A versão publicada preserva autenticação, API e conexão com o banco.
