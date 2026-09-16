# Modo escuro clínico e central Owner

## Objetivo

Permitir que cada clínica escolha entre os temas claro e escuro sem alterar seus dados, mantendo o ambiente Owner em modo escuro e tornando as áreas já existentes de gestão da plataforma acessíveis pelas rotas do menu.

## Direção de design

- **Estética:** operação clínica serena, com modo escuro discreto e profissional.
- **Âncora visual:** superfícies grafite profundas, acento teal BHON e informações operacionais legíveis sem neon excessivo.
- **DFII (subjetivo):** 14/19 — impacto 4, adequação 5, viabilidade 4, desempenho 5, risco de consistência 4.
- **Tipografia:** Manrope para leitura e IBM Plex Mono para dados operacionais, preservando a identidade existente.
- **Movimento:** apenas transição curta de cores; respeitar `prefers-reduced-motion`.

## Arquitetura

1. Criar um `ThemeProvider` com preferência `light` ou `dark`, inicializada por `localStorage` e aplicada na raiz clínica através de uma classe de tema.
2. Disponibilizar um botão acessível no cabeçalho clínico, com rótulo explícito e estado visível, para alternar o tema. O Owner permanece escuro por padrão e não recebe alternância nesta fase.
3. Expandir os tokens CSS existentes para que `bhon-clinic-theme` use variáveis tanto em claro quanto em escuro. Componentes reutilizáveis (painéis, tabelas, campos, drawer e estados vazios) continuarão consumindo tokens em vez de cores isoladas.
4. Trocar, em `App.tsx`, os placeholders das rotas Owner pelos componentes existentes: clínicas e dossiê, assinaturas, faturamento, receita, clientes, usuários, suporte, indicadores e configurações.
5. Usar `OperationalDataProvider` já montado como fonte das telas Owner nesta etapa. Não haverá alegação de que são integrações externas persistentes; Stripe, WhatsApp e observabilidade continuam uma fase posterior.

## Fluxos e erros

- A preferência é local ao navegador; se o armazenamento falhar, o tema claro clínico é usado como fallback.
- A alternância não dispara chamadas de rede nem altera dados clínicos.
- Rotas Owner exibem componentes reais; estados vazios e ações permanecem os definidos pelos próprios componentes.
- O guard de papel continua impedindo acesso de usuários clínicos às rotas `/platform/*`.

## Testes e validação

- Teste do provider: valor padrão, persistência e alternância.
- Teste do botão: rótulo, estado e aplicação da classe no layout clínico.
- Testes de rotas Owner: cada rota renderiza a página real, não `PlatformUnavailablePage`.
- Regressão completa, TypeScript/build e preview Vercel antes de promover a produção.
- Conferência em larguras de 390 px, 768 px e desktop; foco por teclado, contraste e movimento reduzido.

## Escopo excluído

- Integrações de Stripe, WhatsApp, Cloudflare, Datadog, Resend e PostHog.
- Sincronização de preferência de tema entre dispositivos.
- Alteração de dados de produção ou migrações de banco.
