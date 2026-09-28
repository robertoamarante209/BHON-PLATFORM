# BHON — Assinaturas Stripe

## Objetivo

Cobrar as assinaturas da plataforma BHON das clínicas de forma confiável. A
Stripe será a fonte externa de pagamentos; o PostgreSQL será a fonte interna
de autorização de acesso, atualizada exclusivamente a partir de eventos Stripe
verificados. O escopo não inclui cobranças de pacientes pelas clínicas.

## Resultado para cada perfil

- **Clínica:** contrata ou regulariza o plano por Checkout hospedado e abre o
  Portal Stripe para consultar faturas, trocar cartão ou cancelar.
- **Owner BHON:** visualiza planos, MRR, clínicas em dia, em atraso e
  canceladas. Não confirma pagamentos manualmente.
- **Sistema:** bloqueia ou limita uma clínica apenas após receber e processar
  um webhook Stripe autenticado e persistido.

## Fluxo escolhido

1. A BHON comercializa um único produto de operação clínica, mantido no domínio
   interno como `BHON_CLINIC`, com dois ciclos autorizados: **R$ 290/mês** e
   **R$ 2.900/ano**. O anual equivale a dez mensalidades por doze meses de uso;
   os três preços legados não são uma oferta comercial válida. Cada ciclo possui
   seu preço Stripe autorizado.
2. Um administrador autenticado de uma clínica solicita Checkout para um dos
   preços permitidos. O servidor resolve o plano e o preço; o navegador nunca
   envia valor, moeda, `priceId` arbitrário ou `tenantId`.
3. O servidor cria/reutiliza um `Customer` Stripe associado à clínica e cria
   uma Checkout Session em modo `subscription`, com teste de 14 dias e chave de
   idempotência ligada à tentativa de contratação. O Checkout informa de forma
   explícita a data e o valor da primeira cobrança; cartão é solicitado antes
   do teste, mas não é cobrado durante os 14 dias.
4. O navegador apenas redireciona para a URL devolvida pela Stripe. O retorno
   de sucesso informa a interface, mas não libera acesso.
5. A Stripe envia webhooks ao endpoint da BHON. O backend usa o corpo bruto,
   `Stripe-Signature` e `STRIPE_WEBHOOK_SECRET` para verificar a assinatura e
   a tolerância de tempo do SDK.
6. O evento é gravado antes de efeitos em uma caixa de entrada durável, com
   `stripe_event_id` único. Entregas repetidas retornam sucesso sem repetir
   efeitos.
7. Uma transação atualiza assinatura, fatura e status da clínica. Eventos mais
   antigos não revertem uma transição mais recente.

## Modelo de dados

As tabelas existentes `SubscriptionPlan`, `Subscription`, `PlatformInvoice` e
`PlatformPayment` continuam sendo o domínio BHON. A migration acrescentará:

- `Subscription.stripeCustomerId`, único por clínica;
- `Subscription.stripeSubscriptionId`, único;
- `Subscription.stripePriceId` e `stripeLivemode`;
- `PlatformInvoice.stripeInvoiceId`, único quando houver fatura Stripe;
- `PlatformPayment.stripePaymentIntentId` e `stripeChargeId`, ambos únicos
  quando presentes;
- `StripeWebhookEvent` com `stripeEventId` único, tipo, modo, payload mínimo
  necessário, recebido/processado em e resultado;
- `SubscriptionTransition` para auditoria das mudanças de estado recebidas da
  Stripe.

Não serão guardados número de cartão, CVC, segredo de cliente, cabeçalho de
webhook nem payloads completos que possam conter mais dados do que o necessário.

## Estados e acesso

| Stripe/BHON | Estado da assinatura | Clínica |
| --- | --- | --- |
| trialing | TRIAL | ativa até o fim do trial |
| active | ACTIVE | ativa |
| past_due ou unpaid | PAST_DUE | ativa durante a carência configurada |
| paused | PAUSED | acesso limitado a faturamento/suporte |
| canceled | CANCELLED | suspensa ao término do período pago |
| incomplete, incomplete_expired ou ausência de assinatura | PAYMENT_PENDING/EXPIRED | sem operação clínica |

O período de carência será uma configuração de servidor em dias, com padrão de
7 dias. Suspensões, reativações e revogações de sessão permanecem executadas no
backend; nunca no frontend ou por redirecionamento de Checkout.

## Endpoints

- `POST /api/platform/billing/checkout`: owner da clínica cria Checkout para
  um plano/ciclo permitido.
- `POST /api/platform/billing/portal`: owner da clínica cria uma sessão do
  Portal para o próprio customer Stripe.
- `GET /api/platform/billing/subscription`: clínica lê o próprio estado,
  plano, período e URL de ação disponível.
- `GET /api/platform/billing/overview`: apenas PLATFORM_OWNER; entrega
  métricas e lista paginada por status.
- `POST /webhooks/stripe`: rota pública somente para a assinatura Stripe;
  não aceita cookie, CORS ou dados de navegador como autorização.

Todas as rotas autenticadas aplicam sessão, RBAC e isolamento de `tenantId`.
O webhook resolve a clínica pela assinatura/customer Stripe e confere metadata
de `tenantId` somente como validação adicional, não como fonte de verdade.

## Configuração e segredos

Somente no backend/Vercel:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_<PLAN_CODE>_MONTHLY`
- `STRIPE_PRICE_<PLAN_CODE>_ANNUAL`
- `STRIPE_BILLING_PORTAL_CONFIGURATION_ID` (se aplicável)
- `STRIPE_BILLING_GRACE_DAYS`

O ambiente inicial será Stripe Test Mode. Chaves live, preços live e endpoint
live só serão cadastrados depois de o fluxo de teste ter sido aprovado. Nenhum
segredo vai para Git, frontend, logs, respostas HTTP ou chat.

## Erros, reconciliação e observabilidade

- Falha de verificação de assinatura retorna 400 e não persiste evento.
- Falha temporária de banco retorna erro para a Stripe tentar novamente.
- Evento duplicado retorna 200 após confirmar a gravação anterior.
- Falha de processamento mantém o evento pendente para nova tentativa segura.
- O owner vê "pendente de conciliação"; não existe botão de marcar fatura como
  paga.
- Uma rotina administrativa reconciliará, sob demanda, o estado de uma
  assinatura com a Stripe sem aceitar mudanças manuais de valor ou acesso.
- Logs estruturados registram IDs internos e IDs Stripe mascarados; alertas
  cobrem falha de webhook, atraso de reconciliação e transição para PAST_DUE.

## Interface

O painel owner substituirá dados locais por API persistida e mostrará MRR,
ARR, assinaturas ativas, em carência, atrasadas e canceladas. Cada clínica
exibirá plano, próxima renovação, estado e ações "Regularizar" ou "Gerenciar
assinatura" quando autorizadas. A área clínica não exibirá identificadores ou
detalhes de cartão.

## Testes de aceitação

1. Checkout em test mode para preço permitido cria sessão apenas para a
   clínica autenticada.
2. Um usuário comum não cria checkout nem portal.
3. Um webhook válido de assinatura ativa libera a clínica e cria uma transição.
4. O mesmo webhook entregue duas vezes cria uma única transição e fatura.
5. Assinatura em atraso mantém acesso apenas durante a carência; ao terminar,
   revoga sessões e suspende operação clínica.
6. Assinatura cancelada preserva acesso até o término já pago e depois
   suspende.
7. Assinatura inválida, assinatura expirada e evento de outra conta Stripe são
   rejeitados sem alterar dados.
8. O retorno de Checkout sem webhook não libera licença.
9. A visão owner e a visão da clínica nunca consultam ou alteram outro tenant.

## Fora de escopo deste ciclo

- PIX, boleto, notas fiscais e impostos;
- reembolso e disputa;
- Stripe Connect;
- cobrança de pacientes;
- alteração de preço no frontend;
- ativação de chaves ou cobranças live.
