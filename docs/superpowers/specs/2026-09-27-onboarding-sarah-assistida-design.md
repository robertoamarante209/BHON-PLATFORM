# BHON — onboarding com Sarah assistida

## Objetivo

Permitir que uma clínica perceba valor operacional em poucos minutos, sem tornar a conexão do WhatsApp Business uma barreira para iniciar o teste.

## Decisões aprovadas

- Plano mensal: R$ 290; anual: R$ 2.900.
- O teste inicia com a clínica usando agenda, pacientes, oportunidades e recuperação.
- WhatsApp oficial não é requisito de ativação.
- A Sarah começa em modo assistido: identifica oportunidades, prepara texto e registra a ação; uma pessoa da clínica envia a mensagem.
- Automação só é habilitada após conexão oficial da Meta, consentimento do paciente e configuração de transferência humana.

## Jornada

1. A pessoa seleciona plano e cria o acesso do proprietário e da clínica.
2. O Stripe Checkout coleta o pagamento de modo hospedado e confirma a assinatura por webhook.
3. A BHON ativa a clínica e inicia o onboarding com uma área demonstrativa e checklist curto.
4. A clínica importa pacientes por planilha-modelo ou começa com poucos cadastros manuais.
5. A visão geral evidencia agenda, faltas, orçamentos sem resposta e mensagens assistidas da Sarah.
6. A conexão do WhatsApp é oferecida apenas como evolução: “Ativar automação da Sarah”.

## Sarah assistida

- Não envia mensagens automaticamente.
- Oferece texto contextual para confirmação, falta, orçamento sem resposta e continuidade de tratamento.
- Abre o WhatsApp com o texto preparado e registra o resultado selecionado pela equipe.
- Para imediatamente quando houver pedido de atendimento humano, opt-out ou tema clínico/sensível.

## Automação oficial

Uma clínica interessada conclui o fluxo Meta Embedded Signup: seleciona a empresa, confirma o número institucional por código e autoriza o canal. A BHON armazena somente os identificadores e tokens necessários, nunca senhas. Webhooks registram mensagens e estados de entrega. Templates e contatos dependem de consentimento e das regras do provedor.

## Cobrança e owner

- O Stripe Checkout cria assinatura para o plano selecionado.
- O webhook, verificado por assinatura, é a fonte de verdade para ativação, renovação, cancelamento, falha de pagamento e faturas.
- O owner visualiza métricas e status persistidos, não dados simulados nem baixas manuais.

## Importação de pacientes

A tela oferece download de modelo, exemplo preenchido, mapeamento de colunas, prévia, erros por linha e confirmação explícita antes da gravação. Campos-base: nome, telefone, e-mail, CPF, data de nascimento, observações e origem.

## Limites de lançamento

- A BHON não promete que a Sarah atende automaticamente antes de a Meta estar conectada.
- A BHON não solicita senha de Facebook ou WhatsApp.
- O checkout não armazena cartão na BHON.

## Verificação

- Teste de assinatura: seleção de plano → checkout → webhook assinado → clínica ativa.
- Teste de onboarding: pular integração → usar agenda e recuperação assistida.
- Teste de importação: modelo válido, erro de linha e confirmação.
- Teste de Sarah: rascunho, abertura manual, registro e bloqueio por opt-out/handoff.
- Teste de tema: painel da Sarah sem superfícies claras em modo noturno.
