# BHON — Ativação da clínica piloto

## Objetivo

Levar uma clínica recém-criada ao primeiro resultado de recuperação de oportunidade em até dez minutos, sem envio automático de mensagens, sem misturar dados de demonstração com dados clínicos reais e sem transformar a operação em um dashboard poluído.

## Resultado esperado

O owner vê um roteiro breve no primeiro acesso e pode concluir, em qualquer ordem:

1. confirmar os dados da clínica;
2. importar pacientes por CSV ou carregar uma demonstração reversível;
3. cadastrar um membro da equipe e abrir a agenda;
4. selecionar uma oportunidade recuperável;
5. preparar, revisar e somente então encaminhar uma mensagem da Sarah.

O fluxo termina em uma tela de resultado claro: uma oportunidade priorizada e uma mensagem preparada. Nenhuma mensagem é enviada automaticamente.

## Escopo funcional

### Progresso de ativação

`OnboardingProgress` já é criado durante o provisionamento da assinatura. Ele será estendido para armazenar passos concluídos, estado de dispensa, origem e timestamps. A API retornará uma visão calculada do progresso e aceitará conclusão explícita de passos. O frontend mostrará um cartão compacto na Visão Geral apenas enquanto houver passos pendentes.

### Demonstração reversível

Uma clínica vazia poderá carregar uma demonstração marcada como `DEMO`. Ela conterá pacientes, uma oportunidade e uma agenda mínima suficientes para ensinar o fluxo. A remoção apagará exclusivamente os registros ligados ao lote de demonstração; a ação exige confirmação visual. A demonstração nunca é carregada sobre uma clínica com dados reais.

### Primeiro resultado com Sarah

Ao existir uma oportunidade, o onboarding orientará o owner para a fila de recuperação. A pessoa seleciona o paciente e abre uma mensagem sugerida. O produto só cria rascunho/registro de intenção: disparos WhatsApp continuam dependentes da conexão oficial e de uma ação humana.

### Ajuda contextual

Uma ajuda lateral discreta explicará o propósito da página, o próximo passo e um caminho de suporte. Não haverá pop-ups recorrentes; a ajuda pode ser fechada e reaparece somente quando o usuário a solicitar.

### Métricas de ativação

Eventos mínimos e sem conteúdo clínico: clínica criada, onboarding aberto, CSV baixado, importação concluída, demonstração carregada/removida, equipe cadastrada, agenda aberta, oportunidade priorizada e mensagem preparada. Cada evento terá tenant, ator, tipo e timestamp; não guardará texto de mensagens, CPF, telefone ou prontuário.

## Interface e arquitetura

- Backend Fastify/Prisma: rotas autenticadas em `/api/onboarding`, serviço de ativação e migração Prisma para passos/eventos/lotes de demonstração.
- Frontend React: `ActivationChecklist` na Visão Geral, rotas existentes para Pacientes, Agenda, Oportunidades e Sarah; nenhum novo menu principal.
- As telas existentes continuam utilizáveis sem concluir onboarding. Owners podem dispensar o roteiro e retomá-lo em Configurações.
- As ações usam os mesmos controles de autorização por tenant já adotados no backend.

## Segurança e privacidade

- Todos os registros pertencem ao tenant autenticado e seguem RLS/isolamento já aplicado.
- Dados demonstrativos possuem marca de origem e remoção delimitada por lote.
- A ação de remover demonstração não toca em dados importados/manualizados.
- Eventos de ativação não registram dados clínicos ou o corpo de mensagens.
- A Sarah prepara mensagens; não envia conteúdo sem canal oficial e confirmação humana.

## Erros e estados vazios

- Importação inválida mantém o modelo CSV disponível e explica apenas a coluna inválida.
- Falha de demonstração não deixa registros parciais: a operação é transacional.
- Se não houver oportunidades, o passo aponta para importação/registro de paciente em vez de fingir um resultado.
- Falha no carregamento do onboarding não bloqueia agenda, pacientes ou demais telas.

## Testes e validação

- Testes unitários para cálculo de passos, evento sanitizado e proteção contra carregar demonstração sobre dados reais.
- Testes de rota para tenant isolation, remoção de lote e ausência de envio automático.
- Testes React para checklist, progresso e navegação para cada passo.
- Build de frontend e suíte focada de backend.
- Verificação no navegador: owner novo chega à Visão Geral, conclui os passos e cria apenas uma mensagem preparada.

## Fora de escopo

- Integração oficial Meta/WhatsApp e envio real.
- Prescrição digital.
- Novas telas clínicas, cobrança adicional ou alteração de preços.

