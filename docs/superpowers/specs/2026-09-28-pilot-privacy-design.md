# BHON — Privacidade operacional para clínica-piloto

**Data:** 28 de setembro de 2026  
**Status:** proposta para revisão  
**Escopo:** base de privacidade e segurança operacional para clínicas-piloto. Não substitui parecer jurídico, certificação, nem a revisão de advogado especializado em LGPD e saúde.

## Objetivo

Permitir que uma clínica-piloto use a BHON para organizar pacientes, agenda, oportunidades e rascunhos de comunicação com controles verificáveis de privacidade. A experiência deve continuar simples: a clínica vê apenas os seus registros, decide quais contatos são permitidos e revisa ações de recuperação antes de qualquer envio externo.

## Premissas e limites

- Para os registros clínicos e de pacientes inseridos pela clínica, a clínica é tratada operacionalmente como **controladora** e a BHON como **operadora**.
- Para cadastro de conta, cobrança, suporte e marketing próprios, a BHON atua como controladora e informa essa finalidade na política pública.
- Dados de saúde, prescrições, diagnósticos e anexos clínicos não entram em logs de auditoria, URLs, eventos de analytics, textos de erro ou mensagens automáticas.
- A Sarah prepara contexto e rascunhos. Ela não entrega mensagem a um provedor até que exista canal conectado, permissão de contato registrada e ação explícita de membro autorizado da clínica.
- Nenhum texto publicado será apresentado como aconselhamento jurídico, conformidade certificada ou garantia absoluta de segurança.

## Resultado visível no produto

### 1. Transparência pública

As rotas `/termos` e `/privacidade` passam a usar uma versão clara, identificada e datada. A política descreve categorias de dados, finalidades, fornecedores, retenção, direitos do titular, canal de privacidade e atualizações. Os documentos mantêm aviso destacado de que a minuta precisa de revisão jurídica antes de lançamento comercial definitivo.

O e-mail público padrão será `privacidade@bhonapp.com.br`. Caso a caixa ainda não exista, o texto exibirá o canal de suporte existente como alternativa transitória, sem afirmar que o endereço está ativo.

### 2. Preferências do paciente

Na ficha do paciente, usuários autorizados poderão registrar preferências operacionais de contato:

- canais permitidos: WhatsApp, ligação e e-mail;
- situação por canal: permitido, recusado ou não informado;
- origem e data do registro;
- responsável que registrou a informação;
- bloqueio de comunicação promocional/recuperação quando houver recusa.

Esses dados não substituem a avaliação jurídica da clínica sobre a base legal aplicável. A BHON os utiliza para impedir ações de recuperação em canais recusados e para dar rastreabilidade à equipe.

### 3. Sarah e recuperação

O fluxo existente de “Preparar com Sarah” permanece rascunho interno. Para um futuro envio, a camada de decisão deve exigir, nesta ordem:

1. integração oficial de canal conectada;
2. paciente com canal permitido e sem opt-out;
3. usuário com papel autorizado;
4. revisão do texto neutro pelo usuário;
5. registro de aprovação e de resultado do provedor.

Enquanto o envio externo não estiver ativado, o produto exibe “rascunho para revisão” e não promete automação de WhatsApp.

### 4. Solicitações de titulares e incidentes

O Owner poderá abrir um registro interno de solicitação de privacidade com tipo, prazo, status e responsável. O registro nunca duplica dados clínicos; aponta apenas para o paciente quando houver identificação. A exportação ou exclusão efetiva permanece uma ação administrativa protegida, não uma exclusão silenciosa no painel.

Um registro de incidente guardará data, sistema afetado, impacto estimado, medidas tomadas e responsáveis. Não conterá senhas, tokens, corpo de prontuário ou cópia de banco. O produto oferecerá um checklist, não uma decisão automática de comunicação à ANPD ou aos titulares.

## Arquitetura

### Dados e isolamento

Novas entidades são sempre escopadas por `tenantId`; consultas e mutações usam `requireAuth`, `requireTenant` e papéis `OWNER`, `ADMIN` ou `MANAGER` conforme a ação. Preferências de contato pertencem ao paciente, mas devem validar a clínica antes de criar ou consultar o registro.

Pedidos de titulares e incidentes ficam em tabelas próprias, separadas de notas clínicas. Todos os novos modelos usam relações e índices por tenant. RLS continua habilitado no banco e as credenciais de serviço ficam somente no backend.

### Auditoria

Toda criação ou alteração de preferência, solicitação ou incidente gera `AuditLog` sanitizado: tipo da ação, recurso, id, ator e tenant. Não registra telefone, texto de mensagem, diagnóstico, documento ou conteúdo médico em `metadata`.

### API

- `GET/PATCH /api/patients/:id/contact-preferences`
- `GET/POST/PATCH /api/privacy-requests`
- `GET/POST/PATCH /api/privacy-incidents`

As rotas retornam somente os campos necessários para a tela. As mudanças são protegidas por sessão, origem confiável e autorização por função. Erros de validação retornam mensagens seguras; acessos fora do tenant retornam a mesma resposta de ausência/restrição para não revelar existência de registros.

### Interface

- A ficha do paciente recebe uma seção compacta “Preferências de contato”.
- Configurações recebe “Privacidade e segurança”, com cartões para solicitações e incidentes; acesso somente de gestão.
- Sarah mantém a indicação de rascunho e, em uma futura etapa de entrega, explica por que um canal não está elegível.
- Termos e privacidade usam linguagem humana, não jargão de segurança.

## Segurança operacional

- Manter sessão HttpOnly, `Secure` e `SameSite`, rate limit de autenticação e verificação de origem para mutações por cookie.
- Restringir segredos a variáveis de ambiente; nenhum segredo em cliente, Git ou logs.
- Manter backups, rotação de acessos, remoção de integrantes desligados e revisão regular de permissões.
- Registrar incidentes por pelo menos cinco anos quando aplicável ao processo de resposta; a decisão de comunicar ANPD/titulares é avaliada por responsável e advogado com base no impacto real.

## Documentos externos necessários

Antes da abertura comercial, um advogado deve validar:

1. Termos de Uso;
2. Política de Privacidade;
3. contrato/SLA com clínica;
4. aditivo de tratamento de dados (DPA);
5. política de retenção e descarte;
6. política e base jurídica de comunicações por WhatsApp/e-mail;
7. processo de atendimento ao titular e incidente.

## Critérios de aceitação

1. O usuário vê documentos públicos atualizados, datados e sem alegação de certificação.
2. Uma clínica não lê nem altera preferências, pedidos ou incidentes de outra clínica.
3. Uma recusa de canal bloqueia a elegibilidade de recuperação naquele canal.
4. A Sarah continua sem criar envio externo, mesmo ao preparar um rascunho.
5. Logs de auditoria novos não incluem campos clínicos ou de contato.
6. Usuários sem papel de gestão não acessam solicitações e incidentes.
7. Testes cobrem tenant isolation, RBAC, opt-out, rascunho sem entrega e documento público.

## Fora de escopo deste ciclo

- Parecer jurídico, contratação de advogado ou criação de caixa de e-mail externa.
- Diagnóstico automático de obrigação de notificar ANPD/titulares.
- Exclusão física autônoma de prontuário, pois pode conflitar com retenção legal e clínica.
- Envio automático por WhatsApp, integração de provedor ou processamento de dados por IA clínica.

