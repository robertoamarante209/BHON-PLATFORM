# BHON — migração guiada de pacientes (ciclo 2)

> **Para execução:** não persistir uma linha até apresentar prévia, erros e confirmação explícita da clínica.

## Objetivo

Permitir que uma clínica migre pacientes de planilhas manuais ou de outro sistema sem comprometer qualidade de dados, prontuários ou isolamento entre clínicas.

## Escopo aprovado

- Importação de `.csv` e `.xlsx` na área de pacientes.
- Instrução visível sobre a estrutura recomendada: `nome` obrigatório; `telefone`, `e-mail`, `CPF`, `nascimento`, `alergias`, `observações` e `origem` opcionais.
- Leitura local, mapeamento de cabeçalhos comuns, prévia e relatório de linhas aceitas/recusadas.
- Importação confirmada pelo usuário, para a clínica da sessão somente.

## Passos

1. Definir parser e normalizador de cabeçalhos com testes para aliases, dados vazios, CPF/telefone e datas.
2. Construir endpoint autenticado de importação em lote com limite de tamanho/linhas, validação por linha e transação somente para linhas válidas após confirmação.
3. Reutilizar a geração atômica de número de prontuário e criar auditoria de importação com contagens; não duplicar identificadores de pacientes quando CPF ou e-mail coincidirem na mesma clínica.
4. Criar painel de importação no fluxo de Pacientes: modelo baixável, instruções, upload, prévia, erros exportáveis e confirmação.
5. Cobrir CSV e XLSX, importação parcial, autorização e isolamento por tenant com testes.
6. Validar em navegador com planilha de exemplo antes de liberar a produção.

## Critérios de aceite

- A clínica entende o formato antes do upload e vê exatamente o que será incluído.
- Dados inválidos não entram silenciosamente.
- Uma importação não cria dados em outra clínica nem altera prontuários existentes.
- A operação deixa trilha de auditoria, com usuário, data e totais.
