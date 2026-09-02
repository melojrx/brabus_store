# Design: Checkout on-line e Mercado Pago para Go-Live

**Data:** 2026-09-01
**Status:** Aprovado para planejamento

## Objetivo

Viabilizar vendas on-line com Mercado Pago Checkout Pro para Pix e cartão, com confirmação automática de pagamento e duas modalidades gratuitas de entrega: retirada na loja e Entrega Braba.

## Escopo de lançamento

### Entrega

- O checkout público oferece somente `PICKUP` e `LOCAL_DELIVERY`.
- `PICKUP` representa retirada na loja, custa `R$ 0,00` e não exige endereço.
- `LOCAL_DELIVERY` representa Entrega Braba, custa `R$ 0,00`, exige endereço completo e é aceita somente quando cidade e UF do endereço correspondem à cidade e UF de `StoreSettings`.
- A Entrega Braba mostra o prazo `A confirmar pela loja`.
- `NATIONAL` não pode ser selecionado ou criado em checkout on-line ou PDV. O valor permanece apenas para leitura de pedidos históricos, sem cálculo ou integração operacional.
- Melhor Envio, cálculo nacional, seleção de serviço nacional, variáveis, verificações e documentação associados deixam de existir.
- `LocalDeliveryZone` deixa de participar de qualquer regra operacional. A tabela pode permanecer temporariamente sem uso até o módulo de cobertura por bairros.

### Pagamento

- Pix e cartão usam Mercado Pago Checkout Pro.
- O pedido é criado com `paymentStatus = PENDING`, valor de frete zero e total correspondente exclusivamente aos itens.
- A preferência do Mercado Pago recebe exatamente o total persistido no pedido, `external_reference` do pedido e `notification_url` específica.
- O retorno do Mercado Pago direciona o usuário para telas de sucesso, pendência, falha ou cancelamento coerentes com o estado real do pagamento.

### Confirmação e operação

- Todo evento de pagamento recebido no webhook deve ter assinatura validada antes de processamento.
- O webhook consulta o pagamento no Mercado Pago e processa cada transição de forma idempotente.
- Uma aprovação atualiza status de pagamento, status operacional, `paidAt`, estoque e o evento `order.paid` em uma única transação lógica.
- Recusa, cancelamento, reembolso e notificações repetidas não podem baixar ou repor estoque mais de uma vez.
- Endpoints de consulta de pagamento só podem expor informações vinculadas a pedido do usuário autenticado.

### Experiência do cliente

- A jornada segue: carrinho, modalidade de entrega, endereço quando aplicável, resumo com frete gratuito, Mercado Pago e confirmação.
- Pix e cartão são concluídos no ambiente hospedado do Mercado Pago; no retorno, a loja mostra o estado do pedido e permite reconsulta enquanto estiver pendente.
- O carrinho é limpo somente depois da criação bem-sucedida de um pedido. Falhas antes dessa criação e cancelamentos preservam os itens para nova tentativa.
- Nenhuma tela, texto ou mensagem operacional pode mencionar Stripe, boleto, Melhor Envio ou confirmação manual de Pix.

## Requisitos rastreáveis

| ID | Requisito | Critério de aceite |
| --- | --- | --- |
| GL-DEL-01 | Limitar modalidades de entrega | UI e APIs aceitam somente `PICKUP` e `LOCAL_DELIVERY`. |
| GL-DEL-02 | Aplicar gratuidade | Pedidos das duas modalidades persistem e enviam ao pagamento frete `R$ 0,00`. |
| GL-DEL-03 | Restringir Entrega Braba | API recusa `LOCAL_DELIVERY` fora da cidade/UF de `StoreSettings`; frontend comunica indisponibilidade. |
| GL-DEL-04 | Remover entrega nacional | Não há código executável, configuração ou documentação operacional de Melhor Envio; `NATIONAL` permanece apenas para leitura de pedidos históricos. |
| GL-MP-01 | Cobrar valor correto | Total persistido do pedido e total cobrado pelo Mercado Pago são idênticos. |
| GL-MP-02 | Receber notificações confiáveis | Preferências incluem `notification_url` e webhook autentica eventos de pagamento. |
| GL-MP-03 | Efetivar pagamento uma vez | Aprovação atualiza pedido, estoque e evento operacional sem duplicação sob retries. |
| GL-MP-04 | Proteger consulta de pagamento | Usuário só consulta pagamento do próprio pedido e não recebe payload bruto do Mercado Pago. |
| GL-UX-01 | Comunicar estados corretamente | Pix, cartão, pendência, aprovação, falha e cancelamento exibem mensagens consistentes. |
| GL-UX-02 | Preservar recuperação de compra | Retorno permite reconsulta de pagamento pendente e carrinho só é limpo após pedido criado. |
| GL-OPS-01 | Homologar antes de produção | Sandbox valida Pix e cartão em retirada e Entrega Braba, inclusive transições e estoque. |

## Backlog de implementação

### P0 - Obrigatório antes do go-live

1. Simplificar os tipos, validações, interface e APIs de entrega para retirada e Entrega Braba gratuita baseada na cidade/UF de `StoreSettings`.
2. Remover Melhor Envio e entrega nacional do checkout, PDV, configurações, scripts, ambiente e documentação.
3. Ajustar criação de pedido e preferência Checkout Pro para que o total seja consistente e contenha a URL de notificação.
4. Implementar processamento autenticado e idempotente do webhook com atualização transacional de pedido, estoque e evento operacional.
5. Restringir a consulta de pagamentos ao pedido pertencente ao usuário autenticado e retornar apenas o resumo necessário.
6. Corrigir telas de sucesso, pendência e cancelamento, incluindo reconsulta e microcopy sem legados.
7. Criar testes de entrega, total, webhook, estoque, autorização e estados de pagamento.
8. Executar e documentar homologação sandbox para Pix e cartão, em retirada e Entrega Braba.
9. Executar pedido controlado em produção após a homologação sandbox aprovada.

### P1 - Após o lançamento

1. Mesclar carrinho de visitante e usuário autenticado.
2. Reordenar estruturalmente as seções do checkout.
3. Criar módulo de Entrega Braba por bairros, com cobertura, taxa e prazo configuráveis.

## Fora de escopo

- Payment Brick.
- Entrega nacional, Melhor Envio e cálculo de frete externo.
- Reserva de estoque durante pendência de pagamento.
- PDV integrado ao Mercado Pago.

## Estratégia de validação

- Testes automatizados para cada requisito `GL-*` aplicável.
- `npm run lint -- .` e `npm run build` sem erros.
- Sandbox: quatro cenários de compra, combinando Pix/cartão com retirada/Entrega Braba; também recusa, cancelamento, reembolso e retry de webhook.
- Produção: pedido controlado de baixo valor, acompanhado até atualização de estoque e status operacional.

## Fluxo de implementação e promoção

- A implementação parte de uma branch de trabalho criada a partir de `main`.
- Não será usado worktree separado.
- Cada etapa concluída passa por validação local antes de seguir para a próxima.
- Após a validação local final, o trabalho fica aguardando autorização explícita do responsável antes de criar commit.
- Após o commit autorizado, o trabalho fica aguardando nova autorização explícita antes de integrar em `main`, que representa produção.
