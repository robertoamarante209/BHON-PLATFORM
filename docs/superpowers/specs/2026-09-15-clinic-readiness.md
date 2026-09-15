# BHON — Operação clínica validável

Escopo aprovado pelo proprietário na conversa de 14/09/2026, incluindo integrações exclusivas do PLATFORM_OWNER. Publicação no GitHub, Supabase e Vercel autorizada após validação.

## Sessão e experiência

Reproduzir retornos indevidos ao login e corrigir a causa. Falha transitória de rede/servidor não equivale a sessão revogada. Cookies, revogação, permissões e isolamento continuam validados no backend. Rotas desconhecidas devem recuperar o destino da sessão autenticada.

Visão Geral substitui Visão do dia. Título: Sua operação de hoje, em um só lugar. Estado vazio: Nenhuma pendência agora. Login receptivo: Bem-vindo à BHON. Sua clínica, pronta para um novo dia. Cabeçalho com saudação por período, dia da semana e totais reais de agendados/concluídos. Ao vivo: N em atendimento atualiza periodicamente e após mudanças locais, com ponto verde e redução de movimento. Falhas mostram indisponibilidade, nunca zero fictício. Respeitar o fuso clínico já usado pelo backend.

Textos em fundos claros usam carvão e cinza escuro com contraste AA; manter legibilidade nos temas escuros existentes, mobile, foco e teclado.

## Disponibilidade

Registrar semana da clínica e de cada profissional, dias fechados e múltiplos intervalos de atendimento por dia (intervalos livres representam pausas). Validar dia, HH:mm, início menor que fim e ausência de sobreposição. A disponibilidade é informativa: não bloqueia agendamentos. Persistir por tenant, controlar edição por permissões da gestão, permitir consulta. Conflitos de edição retornam erro acionável em vez de sobrescrever silenciosamente.

## Protocolos e orçamentos

Protocolos são modelos definidos pela clínica, com título, descrição e etapas ordenadas; nunca gerar condutas clínicas. Cadastrar, editar, consultar e desativar preservando histórico. Orçamentos devem poder ser criados e aprovados usando contratos existentes, valores calculados no servidor e isolamento de paciente/tratamento. Completar fluxo suportado pelo modelo existente e testar efeitos transacionais e concorrência. Não apresentar sucesso sem persistência.

## Integrações

Remover menu, seção e rota da clínica. Disponibilizar apenas em /platform/integrations protegido por PLATFORM_OWNER, como preparação para etapa futura. APIs de configuração não podem continuar acessíveis a usuários clínicos. Nenhuma conexão externa é ativada nesta etapa.

## Validação e publicação

Testar frontend/backend, migrations em PostgreSQL descartável, permissões, isolamento, concorrência e jornadas de cadastro/atendimento/orçamento/protocolo. Verificar visual desktop/mobile e erros no navegador. Dados de teste ficam em ambiente descartável. Aplicar migrations aditivas com RLS e sem exposição via Data API. Revisão independente antes do merge; verificar deployment READY, saúde da API/banco e smoke após publicar. Registrar limites reais da validação, sem prometer ausência absoluta de bugs.
