# Venda Fiado e Titulos por Cliente Design

**Data:** 2026-09-06  
**Status:** Aprovada para planejamento de implementacao  
**Base:** `main` em `2c14075`  
**Branch de trabalho:** `codex/fiado-titulos`, criada diretamente a partir de `main` no checkout atual. Nao usar worktree separado.

## Objetivo

Permitir que o PDV realize venda `FIADO` exclusivamente para um cliente cadastrado, baixe o estoque no ato da compra e registre a cobranca separadamente. O sistema deve permitir consultar os titulos e os itens comprados dentro dos detalhes do cliente, registrar pagamentos totais ou parciais e aplicar cada recebimento automaticamente ao saldo mais antigo do cliente.

## Decisoes de negocio aprovadas

- Fiado existe somente no PDV; nunca no checkout publico.
- A venda fiado exige `Customer` ativo, selecionado no PDV, com `name` e `phone` preenchidos. CPF, CNPJ, e-mail, endereco e conta de login sao opcionais.
- Cliente avulso/de balcao, dados digitados manualmente e cliente sem telefone nao podem concluir uma venda fiado.
- Nao ha limite de credito, vencimento, juros, multa ou correcao nesta primeira versao.
- Um administrador pode bloquear ou desbloquear novas vendas fiado de um cliente. O bloqueio nao altera nem remove titulos existentes.
- Estoque baixa na venda fiado, dentro da mesma transacao que cria o pedido e o titulo. Recebimentos posteriores nao alteram estoque.
- Cada recebimento e aplicado ao saldo geral do cliente, quitando titulos abertos do mais antigo para o mais recente (FIFO).
- Um recebimento nao pode ultrapassar o saldo total em aberto. A primeira versao nao cria credito a favor.
- A aba financeira no detalhe do cliente chama-se **Titulos**.
- A area de Pedidos sera a consulta transversal, com filtros por cliente, periodo, canal, status operacional, metodo/situacao de pagamento e situacao do titulo.
- `ADMIN` e `SELLER` podem vender fiado e registrar recebimentos. Somente `ADMIN` bloqueia/desbloqueia fiado e estorna recebimentos.
- Registros financeiros nao sao editados ou excluidos. Correcao ocorre por estorno rastreavel.

## Situacao atual relevante

O projeto possui `Customer` separado de `User`, mas o PDV ainda depende de um `userId` para criar `Order`. `Order` usa `paymentStatus` como uma representacao unica e os pedidos pagos baixam estoque. Essa estrutura nao suporta cliente presencial sem conta, saldo parcial ou auditoria de recebimentos. A implementacao precisa preservar os pedidos existentes e manter o historico de conta do cliente separado de autenticacao.

## Modelo de dominio proposto

### Pedido e cliente

- Adicionar `FIADO` ao enum `PaymentMethod`.
- Tornar `Order.userId` opcional para vendas presenciais ligadas somente ao cadastro mestre. Preservar a relacao `User -> Order` para checkout online e pedidos existentes.
- Adicionar `Order.customerId` opcional, com relacao a `Customer`. Para venda fiado, este campo e obrigatorio; para demais pedidos, permanece opcional enquanto a migracao de dominio e gradual.
- Preservar os snapshots de nome, telefone e e-mail no pedido. Eles representam os dados apresentados no momento da venda, enquanto `Customer` identifica o titular atual do titulo.
- Para venda fiado de balcao entregue no ato, criar `Order` com `channel = PDV`, `status = DELIVERED`, `paymentMethod = FIADO` e `paymentStatus = PENDING`.

### Perfil de credito no cliente

Adicionar a `Customer`:

- `creditBlocked Boolean @default(false)`;
- `creditBlockedReason String?`;
- `creditBlockedAt DateTime?`;
- `creditBlockedByUserId String?`.

Bloqueio e desbloqueio devem criar eventos de auditoria no dominio financeiro, com operador, data, acao e motivo. O motivo sera obrigatorio para bloquear e opcional para desbloquear.

### Titulos e recebimentos

Criar os seguintes modelos:

1. `CustomerReceivable`
   - Um titulo por pedido fiado, por meio de `orderId @unique`.
   - Relacao obrigatoria com `customerId` e `orderId`.
   - `originalAmount Decimal(10,2)`, `openAmount Decimal(10,2)`, `status` (`OPEN`, `PARTIAL`, `SETTLED`, `CANCELLED`), `settledAt`, `cancelledAt` e timestamps.
   - Indices para `customerId + status + createdAt`, para a consulta e a alocacao FIFO.

2. `CustomerPayment`
   - Um recebimento imutavel: `customerId`, `amount Decimal(10,2)`, `paymentMethod` restrito a `CASH`, `MANUAL_PIX`, `POS_DEBIT` ou `POS_CREDIT`, referencia, observacao, `receivedAt`, `receivedByUserId` e `idempotencyKey @unique`.
   - Um estorno nao apaga esse recebimento: registra `reversedAt`, `reversedByUserId`, `reversalReason` e um evento de auditoria.

3. `CustomerPaymentAllocation`
   - Liga um recebimento a um titulo: `paymentId`, `receivableId`, `amount Decimal(10,2)` e timestamp.
   - Cada nova alocacao diminui `CustomerReceivable.openAmount`; o status muda para `PARTIAL` ou `SETTLED` conforme o saldo.

4. `CustomerCreditEvent`
   - Trilha imutavel para criacao/cancelamento de titulo, recebimento, estorno, bloqueio e desbloqueio.
   - Registra `customerId`, tipo do evento, operador, referencias dos registros financeiros, valor quando aplicavel, motivo e timestamp.

`openAmount` e mantido como saldo materializado para leitura eficiente, mas toda alteracao deve ser derivada da criacao ou reversao de alocacoes dentro de transacao. Nunca pode ser atualizado por uma tela de edicao direta.

## Regras transacionais

### Criacao da venda fiado

1. Validar sessao de equipe e payload do PDV.
2. Validar o cliente mestre: existe, esta ativo, tem nome e telefone e nao esta com `creditBlocked`.
3. Validar itens, estoque e desconto com as mesmas regras de uma venda PDV existente.
4. Em uma unica transacao, alocar numero do pedido, criar `Order`, criar itens, baixar estoque, criar `CustomerReceivable` com saldo igual ao total final e criar evento de credito.
5. Se qualquer etapa falhar, nenhuma baixa de estoque, pedido ou titulo e persistido.

### Registro de recebimento

1. Validar que o valor e positivo, o metodo e permitido e o cliente esta ativo.
2. Criar ou reutilizar o idempotency key da requisicao para evitar duplicacao por duplo clique ou retentativa.
3. Em transacao serializavel, consultar os titulos `OPEN` e `PARTIAL` do cliente por `createdAt ASC, id ASC`.
4. Rejeitar se o valor recebido for maior que a soma de `openAmount` desses titulos.
5. Criar `CustomerPayment`, criar alocacoes FIFO, reduzir os saldos e atualizar as situacoes dos titulos.
6. Quando uma venda for totalmente quitada, atualizar apenas o `paymentStatus` do pedido associado para `PAID` e preencher `paidAt`; o pedido permanece `DELIVERED`.
7. Criar um evento de credito para cada recebimento. O dashboard financeiro soma recebimentos, e nao o valor total de pedidos fiado abertos.

### Estorno e cancelamento

- Estorno de recebimento e exclusivo de `ADMIN`; reverte as alocacoes em transacao, restaura saldos e reabre os titulos correspondentes. O recebimento original permanece gravado e marcado como estornado.
- Um titulo sem recebimento pode ser cancelado junto com seu pedido; a operacao devolve estoque uma unica vez e marca o titulo `CANCELLED`.
- Pedido fiado com recebimento parcial ou total nao usa o atalho atual de cancelamento. A primeira versao devolve erro orientando que o recebimento deve ser estornado antes do cancelamento.

## Interface e navegacao

### PDV

- Adicionar a opcao `Fiado` ao seletor de pagamento do PDV.
- Ao selecionar, ocultar campos de recebimento imediato, forcar `paymentStatus = PENDING` no cliente e exigir um cliente cadastrado selecionado.
- Exibir mensagem clara quando nao houver cliente, telefone/nome estiver ausente, o cadastro estiver inativo ou o credito estiver bloqueado.
- O botao de concluir cria venda entregue, baixa estoque e redireciona ao detalhe do pedido. O resumo de sucesso informa que o titulo ficou aberto.

### Clientes e aba Titulos

- Criar pagina de detalhe em `/admin/customers/[id]`, acessivel a partir da listagem existente.
- Aba **Cadastro**: dados do cliente e controle de bloqueio de novas vendas fiado.
- Aba **Titulos**: saldo total em aberto, lista de compras fiado com numero, data, itens, valor original, valor pago, saldo e situacao; e historico de recebimentos com metodo, referencia, operador e alocacoes.
- O formulario **Registrar recebimento** informa valor, metodo, referencia opcional e observacao. A tela mostra o resultado das alocacoes FIFO depois da persistencia.
- Acoes de bloquear/desbloquear e estornar exibem confirmacao e feedback; estorno exige motivo.

### Pedidos

Reestruturar `/admin/orders` como consulta server-side com paginacao e filtros preservados na URL:

- busca por numero do pedido, nome ou telefone do cliente;
- periodo por `createdAt`;
- canal: `ONLINE`, `PDV`, `LEGACY`;
- status operacional;
- metodo e status de pagamento;
- situacao de titulo: `OPEN`, `PARTIAL`, `SETTLED`, `CANCELLED` ou nao se aplica.

A listagem deve mostrar cliente de forma segura para pedidos sem `User`, usando snapshots e a relacao `Customer` quando existir. Um pedido fiado exibe seu saldo atual e leva ao detalhe do cliente.

## Relatorios e efeitos financeiros

- Venda comercial: conta o total do pedido fiado na data da compra, junto aos demais pedidos PDV.
- Receita financeira: soma `CustomerPayment` nao estornado na data de recebimento. Nao deve contabilizar novamente o total de uma venda fiado quando ela for quitada.
- Estoque: baixa na compra e so retorna no cancelamento valido da venda, nunca no recebimento, pagamento parcial ou quitacao.

## Seguranca e validacao no servidor

- Nunca confiar no estado do seletor de pagamento no navegador.
- Validar roles, cliente, bloqueio, saldo, metodo de recebimento, limite de valor e idempotency key nas rotas do servidor.
- Usar `Prisma.$transaction` para venda, recebimento, estorno e cancelamento relacionado a titulo.
- Validar o saldo no banco dentro da transacao antes de criar alocacoes. A interface e apenas uma ajuda, nao a autoridade financeira.
- Evitar reaproveitar a rota genérica de alterar pagamento de pedidos para recebimentos fiado; as rotas de titulos mantem a auditoria e impedem edicao destrutiva.

## Fora de escopo desta versao

- limite de credito monetario;
- vencimento, juros, multa, correcao e cobranca automatizada;
- credito a favor ou recebimento acima do saldo;
- fiado no checkout publico;
- parcelamento de um titulo em agenda de parcelas;
- cancelamento de pedido ja parcialmente pago sem primeiro estornar o recebimento;
- migracao retroativa de pedidos antigos para titulos.

## Criterios de aceite e testes

### Testes de dominio e API

- Rejeitar venda fiado para cliente inexistente, inativo, bloqueado, sem nome ou sem telefone.
- Criar venda fiado para cliente elegivel, com `Order`, titulo e baixa de estoque na mesma transacao.
- Verificar que recebimento parcial nao muda estoque e reduz o titulo mais antigo.
- Verificar que um recebimento quita varios titulos em ordem FIFO e atualiza cada saldo corretamente.
- Rejeitar pagamento de valor zero, negativo, metodo nao permitido, excesso de saldo e idempotency key duplicado.
- Verificar que estorno restaura as alocacoes e os saldos sem apagar o recebimento original.
- Rejeitar cancelamento de pedido fiado parcialmente ou totalmente quitado ate que os recebimentos sejam estornados.
- Verificar que pedidos online e PDV nao fiado conservam os comportamentos atuais de pagamento e estoque.

### Verificacao manual

1. Criar um cliente somente com nome e telefone; vender fiado pelo PDV e confirmar saldo na aba **Titulos**.
2. Registrar um pagamento parcial em dinheiro e conferir itens, saldo e estoque inalterado.
3. Criar uma segunda compra, registrar pagamento que atravesse os dois titulos e conferir a alocacao FIFO.
4. Bloquear o cliente e confirmar que uma nova venda fiado e recusada, mantendo a consulta e os recebimentos acessiveis.
5. Estornar um recebimento como administrador e confirmar a recomposicao do saldo e a trilha de auditoria.
6. Consultar Pedidos pelos filtros de cliente, canal, periodo, metodo e situacao de titulo.

## Sequencia de implementacao

1. Migracao Prisma e contratos do dominio financeiro.
2. Servicos transacionais de venda, alocacao, recebimento, estorno e cancelamento.
3. Integracao do PDV e rotas protegidas.
4. Detalhe de cliente com aba **Titulos** e controle de bloqueio.
5. Filtros server-side e apresentacao de saldo em Pedidos.
6. Atualizacao de dashboard e cobertura de testes, seguida de lint, testes, build e validacao manual.
