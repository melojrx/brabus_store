# Checkout Pro em Nova Aba

## Objetivo

Manter a Brabus aberta durante o pagamento no Mercado Pago Checkout Pro e dar ao cliente uma tela própria para acompanhar o pedido até a confirmação financeira.

## Fluxo aprovado

1. O checkout cria o pedido pendente e a preferência Mercado Pago como hoje.
2. Ao receber `initPoint`, o navegador abre o Checkout Pro em uma nova aba iniciada pelo clique do cliente.
3. A aba da Brabus navega para `/checkout/success?order_id=<id>`.
4. A tela de sucesso consulta o pedido local imediatamente e a cada cinco segundos por até dois minutos enquanto o pagamento estiver pendente.
5. O webhook Mercado Pago atualiza `paymentStatus` e o estado operacional do pedido; a tela local reflete `Pagamento aprovado`, `Pagamento em análise` ou `Pagamento não aprovado`.
6. A tela oferece acesso ao detalhe em `/account/orders/<id>` e à lista de pedidos.

## Fallback

Se o navegador bloquear a nova aba, a Brabus permanece na tela de acompanhamento e exibe um link explícito para abrir o Checkout Pro. O pagamento não depende de `auto_return`; as `back_urls` permanecem como retorno manual opcional do Mercado Pago.

## Área do Cliente

`/account/orders` exibirá pagamento e status operacional separadamente. O detalhe continuará protegido pelo `userId` do pedido e apresentará o mesmo estado financeiro.

## Critérios de Aceite

- Clicar para pagar abre Checkout Pro em nova aba sem bloquear a tela Brabus.
- A aba Brabus navega para o acompanhamento do pedido criado.
- Um pedido aprovado pelo webhook passa para `PAID` sem recarregar manualmente a página.
- O cliente só pode consultar os próprios pedidos.
- O fallback torna o link de pagamento acessível quando a abertura da nova aba falhar.
- Pix e cartão usam o mesmo fluxo.
