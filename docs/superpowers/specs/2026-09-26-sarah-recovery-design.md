# Sarah — motor de recuperação comercial

## Objetivo

Transformar faltas, orçamentos não convertidos e tratamentos interrompidos em oportunidades priorizadas, com comunicação profissional, consentida e transferível para a equipe humana. Sarah é uma assistente virtual da clínica, não uma profissional de saúde e não toma decisões clínicas.

## Escopo de lançamento

- Classificar oportunidades por potencial, urgência, resposta anterior e próxima ação.
- Criar cadências de recuperação para falta, orçamento parado e tratamento interrompido.
- Gerar rascunhos revisáveis para WhatsApp Business e registrar o resultado de cada contato.
- Mostrar fila humana com estados `agir agora`, `Sarah conduzindo` e `encerrado`.
- Registrar consentimento, recusa de contato, transferência e auditoria por paciente.
- Durante atendimento, abrir prescrição no fluxo oficial aplicável e registrar o documento no prontuário; Sarah não cria, altera ou assina prescrições.

## Limites obrigatórios

- A clínica é controladora dos dados; a BHON atua como operadora conforme a configuração da clínica.
- Nenhuma mensagem automática é iniciada sem consentimento explícito, rastreável e revogável para WhatsApp.
- Mensagens não expõem diagnóstico, procedimento, medicamento ou outro dado de saúde. Devem usar dados mínimos e linguagem de cuidado.
- Pedido de humano, opt-out, urgência, dúvida clínica, baixa confiança ou negociação excepcional interrompem a automação e criam fila humana.
- Sarah não cria nem modifica agenda, orçamento, prontuário ou pagamento sem uma ação humana autorizada.
- Uma oportunidade possui uma única cadência ativa por vez.

## Apresentação e tom

No primeiro contato, Sarah se apresenta como `Sarah, assistente virtual da Clínica [nome]`. O tom é profissional, acolhedor e objetivo. Mensagens possuem um único objetivo operacional e oferecem sempre uma saída clara: atendimento humano, reagendamento, recusa ou encerramento.

## Cadências

### Falta

1. Mesmo dia: convite para reagendar.
2. Após 48 horas sem resposta: segunda tentativa curta.
3. Sem resposta: encerrar ciclo como não respondido e deixar disponível para ação humana.

### Orçamento parado

1. Após 24 horas: contexto de continuidade e pergunta aberta.
2. Após 3 dias: reforço de valor e alternativa de atendimento.
3. Após 7 dias: convite final respeitoso; encerrar ciclo se não houver resposta.

### Tratamento interrompido

1. Após 7 dias: convite de retomada centrado no cuidado.
2. Após 21 dias: lembrete de acompanhamento.
3. Após 45 dias: último convite, seguido de encerramento.

Cada ciclo tem, no máximo, duas tentativas sem resposta depois do primeiro contato e respeita preferências de horário configuradas pela clínica.

## Modelo de dados

### ContactConsent

`clinicId`, `patientId`, `channel`, `purpose`, `status`, `capturedAt`, `source`, `policyVersion`, `revokedAt`, `revocationSource`.

### RecoveryOpportunity

`clinicId`, `patientId`, `sourceType`, `sourceId`, `stage`, `estimatedValue`, `priorityScore`, `strategy`, `nextActionAt`, `assignedTo`, `closedReason`, `createdAt`, `updatedAt`.

### RecoverySequence

`opportunityId`, `step`, `scheduledAt`, `status`, `messageTemplateVersion`, `sentAt`, `respondedAt`, `handoffAt`, `endedAt`.

### CommunicationEvent

`clinicId`, `patientId`, `opportunityId`, `channel`, `direction`, `kind`, `contentRedacted`, `providerMessageId`, `actorType`, `actorId`, `occurredAt`.

Audit events são append-only. Conteúdo de mensagem é minimizado e protegido; métricas não requerem conteúdo clínico.

## Handoff humano

Sarah encerra a automação e abre uma tarefa quando encontra as palavras ou intenções de urgência, insatisfação, solicitação de pessoa, dúvida clínica, contraproposta financeira ou incerteza de classificação. A tarefa contém apenas contexto comercial mínimo, histórico resumido e a próxima ação recomendada.

## Integrações

### Fase 1 — operação sem custo recorrente

- WhatsApp Business App: rascunhos aprovados e abertura manual da conversa.
- Prescrição Eletrônica CFO: acesso guiado para dentistas ativos, com registro de referência no prontuário.

### Fase 2 — conectores oficiais

- Meta WhatsApp Cloud API: Embedded Signup, token cifrado por clínica, webhook assinado, normalização de eventos, opt-out e handoff.
- Memed: credenciais por ambiente, usuário prescritor habilitado, histórico e referência de documento no prontuário. Serve múltiplas profissões habilitadas, inclusive CRO, conforme o provedor.
- Stripe: assinatura BHON de R$ 390 por clínica, Checkout, portal do cliente e webhooks idempotentes.

Conectores são exibidos como desconectados até as credenciais serem validadas. Não haverá envio, cobrança, assinatura ou sincronização simulada.

## Métricas de sucesso

- oportunidades recuperadas e valor recuperado;
- taxa de resposta, agendamento e conversão por estratégia;
- tempo até primeiro contato e tempo até handoff;
- opt-outs e contatos interrompidos;
- resultado por clínica, equipe e origem, sem usar dados clínicos em análises comerciais.

## Testes e aceite

- RLS e isolamento por clínica para todas as novas tabelas.
- Testes de consentimento, opt-out, deduplicação e limite de cadência.
- Testes de webhook: assinatura inválida, evento duplicado, reentrega e ordem fora de sequência.
- Testes de handoff e garantia de que dados clínicos não saem no texto comercial.
- Testes de navegação desktop e mobile para fila, detalhe e transição de status.
- Sandbox dos provedores antes de produção; produção somente após credenciais válidas e observabilidade de eventos.

## Registro de validação da fundação — 26/09/2026

### Validado localmente

- Migração `20260926120000_add_sarah_recovery` executada em banco PGlite vazio junto às migrações existentes; relações cruzadas entre clínicas foram rejeitadas por restrições compostas.
- `backend/test/recovery-schema.test.mjs`: 17 cenários aprovados para integridade por clínica, eventos append-only e sequência ativa única.
- `backend/src/domain/recovery.test.ts`: 6 cenários aprovados para consentimento explícito de WhatsApp, cadência e pontuação determinística.
- `backend/test/recovery-http.test.mjs`: 9 cenários aprovados para isolamento por clínica, consentimento, catálogo comercial fechado, conteúdo redigido, handoff e opt-out repetido.
- `backend/test/security.test.mjs`: 7 cenários aprovados para limite de login, limite central de API, `Retry-After`, isolamento de IP e exclusão dos health checks.
- Build de produção do frontend executado diretamente com Vite: 1.604 módulos transformados e bundle concluído. A fila Sarah possui chunk próprio (`SarahRecoveryPage`).
- `SarahRecoveryPage.test.tsx`: 11 cenários aprovados com um worker e timeout explícito de 20 segundos, cobrindo consentimento, revisão, handoff, opt-out, foco por URL, erro de carregamento e link manual do WhatsApp.

### Escopo confirmado

- WhatsApp nesta fase é somente uma abertura manual de `wa.me` após revisão humana. Não existe envio pela BHON, token Meta, webhook, estado de conexão ou cobrança simulada.
- Prescrição CFO, Meta WhatsApp Cloud API, Memed e Stripe permanecem desconectados. Cada conector exige seu próprio plano, credenciais oficiais e validação em sandbox/produção.
- O rate limit geral de lançamento é local à instância: 240 requisições por minuto por IP, com login mantendo limite de 5 falhas em 15 minutos por IP e identidade. Antes de escalar na Vercel, deverá ser substituído por armazenamento compartilhado.

### Limitação conhecida de ambiente

As tentativas de `npm test` completo no backend e de suíte Vitest completa do frontend não entregaram um resumo conclusivo nesta sessão por processos de runner que excederam a janela de captura ou timeout de worker. Esses comandos não são declarados aprovados neste registro. Os testes focados e o build acima foram executados com resultado explícito.
