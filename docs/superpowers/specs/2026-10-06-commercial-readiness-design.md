# BHON — Preparação Comercial: Especificação Técnica

## Objetivo

Tornar o código publicado da BHON seguro para um piloto clínico controlado e remover promessas do produto que não podem ser verificadas. O trabalho não criará cobrança em produção, não enviará e-mail, não alterará o plano do Supabase/Vercel e não tratará uma revisão jurídica como concluída.

## Decisão

A implementação será dividida em blocos de segurança que podem ser publicados de forma independente. Cada bloco terá testes automatizados e uma fronteira clara entre código da aplicação e trabalho operacional externo.

### 1. Proteções comerciais e comunicação pública verdadeira

O fluxo público de teste ficará indisponível por padrão até que o deploy receba a configuração explícita `LEGAL_COMMERCIAL_APPROVED=true`. As páginas jurídicas continuarão com o aviso de rascunho. A oferta anual exibirá o preço anual exato e seu equivalente mensal matematicamente correto. Navegador e servidor aplicarão o mesmo mínimo de doze caracteres para senha.

Isso impede uma contratação pública acidental enquanto revisão jurídica, Stripe live, responsável por suporte e infraestrutura ainda não estiverem prontos. Não substitui uma revisão jurídica.

### 2. Recuperação de senha

O backend emitirá tokens de redefinição de senha de uso único, com hash e expiração; revogará tokens anteriores da conta e invalidará as sessões existentes após uma redefinição bem-sucedida. Um adaptador de entrega usará Resend apenas quando as variáveis de produção forem configuradas explicitamente. O navegador nunca receberá um token de redefinição. Quando a entrega não estiver configurada, a tela de login informará que a recuperação é assistida, em vez de apresentar um controle sem funcionamento.

### 3. Proteção durável contra abuso e recuperação de webhooks

O limitador em memória de login/teste será substituído por registro PostgreSQL, neutro em relação à clínica e indexado por digest opaco normalizado. Assim, os limites sobrevivem à reinicialização do container e valem entre instâncias. O sistema não registrará senhas e manterá erros de autenticação genéricos.

Eventos de webhook Stripe continuarão sendo gravados antes do processamento. Falhas terão metadados de falha e contador de tentativas; um endpoint interno autenticado reprocessará eventos pendentes elegíveis. Ele só será acionável com um segredo de cron configurado e poderá ser reexecutado com segurança. O agendamento no Vercel dependerá de configuração posterior do ambiente de produção e de deploy testado.

### 4. Console operacional do owner sem dados fictícios

A interface do owner consumirá somente dados da API. Usuários estáticos, estados fictícios de gateway, horários inventados de backup e alegações de Multi-AZ serão removidos. A página da plataforma mostrará saúde real da aplicação e estados claros de “não configurado”. Qualquer status de disponibilidade ou integração se referirá exclusivamente a configuração persistida, nunca a uma conexão de terceiro apenas presumida.

### 5. Segurança, confiabilidade e evidências de release

O repositório receberá correções de dependência quando a resolução for possível sem quebrar a versão suportada de Prisma, uma lista de verificação de segurança/release e cobertura automatizada para redefinição de senha, limite de tentativas, retry Stripe, preço e autorização por clínica. Jornadas reais de banco e navegador serão registradas como gates de release; elas exigem PostgreSQL/Supabase descartável e credenciais protegidas semelhantes às de produção, que não serão criados por esta mudança.

## Modelo de dados e acesso

- `PasswordResetToken`: digest do token, relação com usuário, expiração, horário de consumo, metadados da solicitação limitados a um sinal de IP com hash e data de criação.
- `RateLimitWindow`: digest da chave, início da janela, número de tentativas e expiração. Os registros serão incrementados atomicamente e removidos periodicamente pelo mesmo processo operacional de retry.
- `StripeWebhookEvent`: amplia a caixa de entrada atual com contador de tentativas, última tentativa e erro de processamento sanitizado. `processedAt` continua sendo a fronteira de idempotência.
- Todos os novos registros usam Prisma apenas no servidor. Clientes públicos recebem somente mensagens genéricas de sucesso, nunca token ou estado interno de banco.

## Tratamento de erros

- A solicitação de recuperação de senha sempre retorna resposta genérica para e-mail existente ou inexistente; somente falha de configuração é apresentada como recurso indisponível.
- Tokens de redefinição valem uma vez, expiram rapidamente e uma redefinição bem-sucedida revoga todas as sessões existentes do usuário.
- O reprocessamento é limitado, idempotente e produz estado de erro visível ao operador depois de esgotar a quantidade de tentativas.
- Falhas da interface Owner exibem indisponibilidade explícita, sem substituir dados por exemplos.

## Estratégia de testes

Cada comportamento começa por um teste que falha. Os testes cobrem pedidos duplicados de redefinição, token vencido/consumido, revogação de sessão, entrega de e-mail não configurada, limite durável entre instâncias, falha/retry/idempotência Stripe, bloqueio comercial, preço correto e ausência de fixtures locais nas páginas Owner. Testes completos de navegador, Stripe live, restauração, PostgreSQL multi-clínica e cancelamento de pagamento continuam sendo gates obrigatórios de release, mas não podem ser automatizados honestamente sem o ambiente externo de teste.

## Pré-requisitos externos e ações excluídas

As decisões abaixo continuam sob responsabilidade humana e não serão automatizadas:

1. Aprovação de advogado para Termos, Política de Privacidade, contrato/DPA, política de retenção e manual de incidentes.
2. Plano pago do Supabase, retenção de backup, exercício de restauração e responsável designado para incidentes.
3. Domínio/API do Resend, produtos/webhook Stripe live, segredo de cron Vercel, conta de monitoramento/rastreamento de erros e aprovações de deploy em produção.
4. Piloto controlado com usuários reais e contrato assinado pelo cliente.

## Critérios de aceite

1. Nenhum checkout público pode começar sem aprovação comercial-jurídica explícita.
2. Um provedor de recuperação configurado permite redefinir senha sem expor segredo; um provedor não configurado não pode se passar por funcional.
3. Limites de login/teste são duráveis entre instâncias de processo.
4. Eventos Stripe que falharem são mantidos e reprocessados com segurança, sem provisionamento duplicado.
5. Páginas Owner não mostram alegações inventadas de integração, backup, usuários ou infraestrutura.
6. A suíte automatizada, type checks, builds e auditoria de dependências são revisados antes do merge.
7. A lista de verificação de release bloqueia claramente a abertura comercial ampla até que os pré-requisitos externos tenham evidência.
