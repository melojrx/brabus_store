# Recuperação da publicação após queda de energia

## Ocorrência e causa

O usuário confirmou queda de energia no Homelab em 10/10/2026. Após o boot, os
serviços retornaram automaticamente, e as quatro aplicações públicas passaram
nas sondas HTTP. A Brabus permaneceu na imagem anterior, com 127 produtos e
247 pedidos, contagens iguais às anteriores à queda.

A retomada do job de publicação foi interrompida por uma tarefa antiga rejeitada.
O controlador examinava todo o histórico de `docker service ps`: qualquer tarefa
antiga rejeitada causava falha, e qualquer tarefa antiga concluída poderia causar
sucesso incorreto. No host, a tarefa rejeitada tinha `ForceUpdate=12`, enquanto a
nova tentativa do serviço tinha `ForceUpdate=13`.

## Correção mínima

`wait_for_migration()` consulta o `ForceUpdate` atual do serviço e inspeciona o
estado apenas das tarefas dessa tentativa. Aguarda uma tarefa nova aparecer;
conclui somente com `complete` atual; mantém falha para `failed`/`rejected` atuais
e o limite existente de 60 tentativas. Nenhuma mudança de esquema ou dados.

## Testes locais

Três casos falharam antes da correção, reproduzindo a falha por histórico antigo,
a aprovação incorreta por sucesso antigo e a rejeição antes da nova tarefa surgir.
Após a correção, sete casos cobrem também falha atual, rejeição atual, sucesso
atual e sucesso antigo combinado com falha atual.

- 102 testes unitários aprovados, usando banco sintético local.
- Lint sem erros; aviso preexistente em `DeliveriesManager.tsx`.
- Verificações existentes do controlador e workflow aprovadas.
- Compilação de produção local aprovada.
- 29 testes de navegador aprovados em banco sintético local.

A publicação deve ser confirmada na execução correspondente.
As verificações de recuperação por boot não equivalem a teste integral de todos
os fluxos de venda, pagamentos, mensagens, backup ou restore.
