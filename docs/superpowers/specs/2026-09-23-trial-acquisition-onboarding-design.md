# BHON — Aquisição, teste e onboarding da clínica

## Objetivo

Converter uma clínica interessada em uma assinatura BHON ativa sem criar uma
barreira desnecessária no cadastro e sem prometer valor antes que a clínica
possa percebê-lo. O primeiro valor operacional deve ser atingido em até 72
horas após o início do teste.

## Oferta comercial

A BHON terá um produto para operação de clínicas, vendido em dois ciclos:

| Ciclo | Preço | Comunicação |
| --- | ---: | --- |
| Mensal | R$ 290 por mês | Flexibilidade para começar sem compromisso anual. |
| Anual | R$ 2.900 por ano | Pague dez meses e use doze; economia de R$ 580 no ano. |

Os dois ciclos começam com 14 dias de teste. O cartão é informado no Checkout
para permitir a assinatura recorrente, mas a cobrança só pode ocorrer ao fim
do teste se a assinatura estiver ativa. A página e o Checkout devem mostrar o
valor, a data da primeira cobrança e a forma de cancelamento antes da
confirmação. A ausência de cancelamento, isoladamente, nunca é tratada como
consentimento: a contratação é o aceite explícito no Checkout.

## Jornada escolhida

1. A pessoa visita o site público, entende os benefícios e escolhe mensal ou
   anual.
2. Um cadastro curto coleta nome da clínica, nome do responsável, e-mail
   operacional, usuário de acesso, senha e telefone/WhatsApp da clínica. O
   número será armazenado para configuração futura; não habilita envio de
   mensagens enquanto a integração não estiver configurada e aprovada.
3. A pessoa visualiza e aceita Termos de Uso e Política de Privacidade em links
   separados, com checkbox obrigatório. O sistema registra versão dos
   documentos, data/hora, usuário e tentativa de cadastro.
4. O backend cria uma tentativa de cadastro provisória e abre o Checkout Stripe
   somente para o ciclo escolhido no catálogo de servidor.
5. O webhook Stripe verificado confirma o início do teste, cria/ativa a
   clínica e o owner dela. A tela de sucesso é apenas informativa até essa
   confirmação chegar.
6. A nova clínica entra no onboarding e pode cancelar pelo Portal Stripe ou
   pela ação de assinatura no painel.

Não será criado um tenant operacional a partir de um redirecionamento do
navegador. Cadastros abandonados permanecem apenas como tentativas provisórias
com retenção limitada, evitando clínicas órfãs e acessos indevidos.

## Proteção contra abuso e dados

- O endpoint público limita tentativas por IP e por e-mail normalizado.
- Um mesmo e-mail não recebe diversos testes simultâneos; revisão do owner
  BHON trata exceções legítimas.
- Senhas são tratadas exclusivamente pelo fluxo de autenticação existente;
  nunca entram em logs, metadados Stripe ou tickets.
- E-mail e WhatsApp são dados operacionais: coleta mínima, acesso por tenant e
  finalidade apresentada no cadastro.
- A validação de e-mail e os avisos externos serão ativados quando Resend for
  integrado. Até lá, a interface não afirma que um aviso foi enviado.

## Onboarding orientado a valor

Após o webhook confirmar `TRIAL`, o painel mostra uma lista persistida, em
ordem prática:

1. confirmar dados básicos da clínica;
2. convidar ou cadastrar ao menos um membro da equipe;
3. cadastrar um paciente ou importar uma planilha validada;
4. criar o primeiro agendamento;
5. registrar uma oportunidade de recuperação ou acompanhamento.

O marco de "primeiro valor" é atingido quando a clínica possui ao menos um
paciente e executa uma atividade operacional relevante: primeiro agendamento
ou primeiro acompanhamento. A lista não bloqueia o produto, mas destaca a
próxima ação e registra progresso. O owner BHON acompanha tempo até esse marco
e consegue priorizar clínicas ainda inativas antes das 72 horas.

## Lembretes e cancelamento

O sistema mantém eventos de ciclo de vida para o 11º, 13º e 14º dia de teste,
além de confirmação de cancelamento, falha de pagamento e reativação. Nesta
etapa eles aparecem no histórico interno e na interface; e-mail e WhatsApp
serão entregues por uma caixa de saída idempotente somente após as integrações
Resend e WhatsApp. As mensagens devem informar situação, prazo e ação clara,
sem alegar envio que não ocorreu.

O cancelamento é feito pelo Portal Stripe autenticado. Enquanto o teste não
termina, a clínica mantém o acesso até a data de encerramento devolvida pela
Stripe. Estado de cobrança e liberação continuam sendo decididos apenas pelo
webhook verificado e pelas regras de carência da especificação Stripe.

## Componentes e limites

- **Site público:** proposta de valor, preços, links legais e CTA para cadastro.
- **Cadastro público:** valida dados mínimos, registra aceite e inicia tentativa
  provisória sem criar acesso operacional.
- **Billing BHON:** resolve preço no servidor, cria Checkout e recebe webhooks
  Stripe conforme a especificação de assinaturas.
- **Provisionamento:** cria tenant e owner após evento Stripe aceito.
- **Onboarding:** persiste tarefas e eventos de ativação por tenant.
- **Visão owner:** exibe funil — cadastros iniciados, Checkouts iniciados e
  concluídos, testes ativos, primeiro valor em até 72 h, conversões e
  cancelamentos.

Não fazem parte deste ciclo PIX, boleto, notas fiscais, cobrança de pacientes,
envio real por WhatsApp/e-mail ou uma decisão jurídica sobre os documentos.
Termos e Política precisam de revisão jurídica antes do lançamento público.

## Erros e estados importantes

- Falha ou abandono no Checkout não cria acesso à clínica.
- Repetição de uma tentativa de Checkout reutiliza a operação idempotente ou
  cria uma nova tentativa vinculada, sem duplicar assinatura.
- Webhook duplicado não provisiona mais de uma clínica ou owner.
- Pagamento recusado após o teste segue o estado `PAST_DUE` e a carência já
  definida para Stripe; não altera manualmente o acesso.
- Se o provisioning falhar após um webhook aceito, o evento fica pendente para
  retomada segura e o owner BHON vê o caso para conciliação.

## Testes de aceitação

1. A página exibe exclusivamente R$ 290 mensal e R$ 2.900 anual, com economia
   anual e duração de teste corretas.
2. Cadastro sem aceite dos dois documentos não inicia Checkout.
3. O cliente não escolhe preço Stripe, valor, moeda ou tenant por parâmetros.
4. Um Checkout abandonado não cria acesso operacional.
5. Um webhook válido de início do teste cria exatamente um tenant e owner.
6. Evento duplicado não duplica tenant, usuário, assinatura ou checklist.
7. A clínica vê o checklist, atualiza o progresso e atinge primeiro valor após
   paciente mais agendamento ou acompanhamento.
8. O owner vê métricas de funil por período sem acessar dados clínicos de
   pacientes.
9. Cancelamento e falha de pagamento obedecem ao estado Stripe processado,
   nunca somente ao retorno do navegador.
