# BHON — site público inspirado na arquitetura Nexus

## Objetivo

Substituir a landing page pública da BHON por uma experiência editorial, escura e
premium, usando como referência técnica o projeto Nexus fornecido pelo usuário.
O resultado deve comunicar uma startup de tecnologia para clínicas de todas as
especialidades, sem afirmar resultados, clientes ou certificações que não possam
ser comprovados.

## Limites de escopo

- Alterar somente as rotas públicas (`/`, `/termos`, `/privacidade`) e os seus
  componentes de apresentação.
- Preservar os fluxos existentes de `/comece`, `/teste-confirmado`, `/login`,
  `/clinic/*` e `/platform/*`.
- Usar a logo fornecida em `C:/Users/ROBERTO T . I/Downloads/logo atualizada (1).png`
  como arquivo de marca oficial, sem edição, recorte, filtros, alteração de cor ou
  reconstrução vetorial.
- Não publicar em produção nesta etapa: validar em prévia primeiro.

## Direção visual

- Base escura em carvão e verde profundo, com acentos teal da marca; sem gradientes
  genéricos ou cartões excessivos.
- Tipografia Manrope já presente no produto, hierarquia ampla e pouco texto por
  bloco.
- Adotar do Nexus os princípios de experiência: entrada tipográfica progressiva,
  navegação que ganha fundo ao rolar, elementos com deslocamento leve, barra de
  progresso de leitura e transições de seção.
- Toda animação respeita `prefers-reduced-motion`; em telas touch, não depender de
  cursor, hover ou paralaxe para transmitir informação.
- Layout responsivo desde 320 px, com menu móvel de abertura controlada, alvos de
  toque amplos e sem conteúdo horizontalmente cortado.

## Arquitetura de conteúdo

1. **Hero** — posicionamento: a operação da clínica sob controle, sem ruído.
   CTAs para iniciar o teste e entrar; logo oficial em destaque discreto.
2. **Manifesto de produto** — BHON como infraestrutura de operação, não mais um
   painel.
3. **Pilares** — agenda, pacientes, equipe, oportunidades e suporte; descrições
   ligadas a rotinas reais.
4. **Como começa** — cadastro, 14 dias de teste, ativação segura após a decisão.
5. **Segurança e responsabilidade** — separação por clínica, permissões e cobrança
   processada pela Stripe, evitando alegações não verificadas.
6. **Planos** — mensal: R$ 290/mês; anual: R$ 2.900/ano, equivalente a 10 meses;
   ambos com 14 dias de teste.
7. **Perguntas frequentes** — teste, cobrança, cancelamento, implantação e suporte.
8. **CTA e rodapé** — caminhos claros de conversão, `bhonsuport@gmail.com`, Termos
   de Uso e Política de Privacidade.

## Voz da marca

Português brasileiro direto, seguro e cordial. Tom executivo, mas sem jargão de
venda ou frases de efeito. A BHON explica o valor pelo trabalho que reduz e pela
clareza que cria, não por promessas grandiosas.

Exemplo: “A BHON organiza o que sua equipe precisa ver para a clínica seguir em
movimento — com menos procura, menos repasse e mais continuidade no cuidado.”

## Requisitos funcionais

- Links internos de navegação com âncoras e retorno à página inicial.
- CTAs para `/comece`; acesso para `/login`.
- `mailto:bhonsuport@gmail.com` no contato.
- Novas rotas públicas para termos e privacidade, com linguagem de produto e aviso
  para revisão jurídica antes de uso comercial definitivo.
- Cobertura de testes para renderização da oferta, rotas legais e CTAs principais.

## Validação

- `npm run build` e `npm test` no frontend.
- Revisão em viewport móvel e desktop, incluindo navegação por teclado e modo de
  redução de movimento.
- Publicação apenas em deployment de prévia; produção permanece inalterada até
  aprovação explícita.
