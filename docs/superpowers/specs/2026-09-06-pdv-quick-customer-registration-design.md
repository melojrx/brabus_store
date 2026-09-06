# Cadastro Rapido de Cliente no PDV

## Objetivo

Permitir que o caixa transforme os dados manuais ja preenchidos no PDV em um cliente cadastrado e selecionado, sem abandonar a venda em andamento.

## Fluxo

1. O atendente informa nome e telefone na secao de cliente do PDV. E-mail permanece opcional.
2. Quando nome e telefone estiverem preenchidos e nenhum cliente mestre estiver selecionado, o PDV exibe a acao `Cadastrar e selecionar cliente`.
3. A acao chama a API administrativa existente de clientes com os tres campos disponiveis.
4. Em sucesso, o cliente retornado passa a ser o cliente selecionado; os campos manuais sao limpos e a venda, itens, entrega, desconto e pagamento permanecem intactos.
5. Se houver erro de validacao ou rede, o PDV exibe a mensagem e preserva os dados digitados para correcao.

## Regras

- Nome e telefone sao obrigatorios para o cadastro rapido.
- E-mail e opcional.
- A funcao reutiliza a API `POST /api/admin/customers`; nao cria uma rota paralela nem um segundo modelo de cliente.
- A venda comum continua aceitando cliente manual sem cadastro.
- Para Fiado, apos o cadastro rapido o cliente selecionado passa pela mesma validacao existente de atividade, nome, telefone e bloqueio de credito.
- O cadastro rapido nao cria User de autenticacao, pedido ou titulo; ele cria somente Customer.

## Validacao

- Testar que o payload rapido exige nome e telefone.
- Testar que uma resposta bem-sucedida seleciona o Customer retornado e preserva o pedido atual.
- Testar que falhas nao limpam os campos manuais.
- Rodar `npm test`, `npm run lint -- .` e `npm run build`.
