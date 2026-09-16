# BHON — operações reais da plataforma (ciclo 2)

> **Para execução:** aplicar cada item com testes primeiro e publicar somente depois da validação integrada.

## Objetivo

Substituir os controles locais do Owner e do suporte por operações persistidas, auditáveis e protegidas por função. O visual atual do Owner não será redesenhado neste ciclo.

## Escopo aprovado

- Owner cria uma clínica e seu responsável inicial com acesso `OWNER`.
- Owner suspende e reativa uma clínica; não haverá exclusão destrutiva.
- Clínica abre chamados; Owner os consulta, assume e encerra; a clínica vê o retorno.
- Toda ação grava `AuditLog` e respeita isolamento de tenant.

## Passos

1. Criar testes HTTP que provem que somente `PLATFORM_OWNER` pode provisionar, suspender e reativar tenants.
2. Implementar `POST /api/tenants` com nome, contato da clínica, responsável, identificador de login e senha temporária. Validar dados, gerar slug determinístico e hash de senha; criar tenant e usuário em transação.
3. Implementar `PATCH /api/tenants/:id/status`, aceitando apenas `ACTIVE` e `SUSPENDED`, revogando as sessões da clínica na suspensão e auditando a mudança.
4. Criar testes HTTP para abertura, listagem por tenant e transição de chamados.
5. Implementar rotas de suporte: clínica cria/lista os próprios chamados; Owner lista todos e atualiza estado/atribuição. Ao encerrar, criar notificação para quem abriu o chamado.
6. Criar cliente frontend tipado para estas APIs; trocar as mutações locais do Owner por requisições reais com feedback de sucesso/erro e atualização da lista.
7. Adicionar a área clínica de suporte e conectá-la às rotas, sem alterar a linguagem visual do dashboard do Owner.
8. Executar testes de backend e frontend focados, typecheck, build e jornada manual de criação/suspensão/suporte antes do deploy.

## Critérios de aceite

- Uma clínica criada pelo Owner tem usuário inicial que pode autenticar.
- Clínica suspensa perde imediatamente as sessões existentes e não entra até reativação.
- Dados clínicos não são excluídos durante suspensão.
- Chamado aberto pela clínica aparece no Owner e o encerramento gera aviso para a clínica.
- Falhas de validação e autorização têm mensagens seguras, sem revelar dados de terceiros.
