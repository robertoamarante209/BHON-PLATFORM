# Identidade visual final da BHON

## Objetivo

Transformar a BHON em um produto clínico premium, escuro e contemporâneo, usando a estrutura e o ritmo do Runey apenas como referência. A identidade, o conteúdo, os dados e os fluxos permanecem próprios da BHON.

## Fundamentos da marca

- Símbolo oficial abstrato fornecido pelo proprietário, sem representação literal de dente.
- Paleta: carvão `#0F1115`, superfície `#181A1F`, teal `#00B894`, off-white `#F8F9F7`, cinza `#6B7280` e borda `#2A2D32`.
- Manrope em toda a interface; números operacionais com alinhamento tabular.
- Teal reservado para seleção, ação primária, progresso e estados positivos.
- Cantos suaves, bordas finas, sombras discretas e alto espaço negativo.

## Ativos

Serão produzidas e verificadas três variantes da nova marca: lockup claro para superfícies escuras, lockup escuro para superfícies claras e símbolo isolado para favicon/navegação compacta. Nenhum ativo anterior será usado na nova interface.

## Login

Uma única tela escura e minimalista, com animação ambiente lenta e não bloqueante. A composição contém somente a marca, o título “Acesse sua clínica”, e-mail, senha, opção de lembrar acesso, erro e ação de entrada. O fluxo de autenticação e os redirecionamentos existentes não mudam.

## Estrutura do produto

- Fundo carvão contínuo e superfícies elevadas em cinza escuro.
- Navegação lateral compacta inspirada no ritmo do Runey, com símbolo BHON, ícones, estados ativos e nomes acessíveis.
- Cabeçalho reduzido a contexto, busca e ações realmente úteis.
- Mobile com navegação inferior e conteúdo sem rolagem horizontal involuntária.

## Dashboard clínico

O dashboard prioriza a operação real: saudação, período, cinco indicadores essenciais, fluxo do dia, próximo atendimento, agenda e acompanhamentos. Os dados continuam vindo das APIs existentes; estados vazios, carregamento e falha permanecem honestos. Nenhum dado fictício será criado.

## Telas internas

Agenda, pacientes, tratamentos, oportunidades, acompanhamentos, orçamentos, financeiro, equipe, indicadores e configurações adotarão os mesmos tokens escuros. Tabelas, formulários, drawers, diálogos e status manterão contraste, hierarquia e ações explícitas. A mudança é visual; contratos de API e regras clínicas não serão alterados.

## Movimento

Transições de entrada entre 180 e 320 ms, usando somente opacidade e transformação. Cards podem aparecer em sequência curta; navegação mantém continuidade visual. `prefers-reduced-motion` reduz tudo ao mínimo.

## Qualidade

- WCAG AA para texto e controles essenciais.
- Foco visível, labels associados e alvos de toque com pelo menos 44 px.
- Validação em 375, 768, 1366 e 1920 px.
- Testes automatizados existentes preservados e novos testes para marca, login, shell e dashboard.
- Build de produção, inspeção visual autenticada e verificação final na Vercel.

## Fora do escopo

Não serão copiadas marca, textos, gráficos, código ou dados do Runey. Não haverá alteração de banco, permissões, autenticação ou inclusão de dados demonstrativos.
