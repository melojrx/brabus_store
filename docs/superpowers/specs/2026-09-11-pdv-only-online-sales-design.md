# Brabus Store: operação exclusiva por PDV

## Objetivo

Suspender temporariamente as vendas online e a integração Mercado Pago, mantendo o catálogo público como canal de descoberta e direcionando clientes para o WhatsApp da loja. As vendas continuam sendo registradas somente pelos usuários autorizados no PDV.

## Decisão

O sistema terá um único controle de execução: `ONLINE_SALES_ENABLED=false`. Enquanto estiver desativado, ele prevalece sobre qualquer token ou configuração Mercado Pago existente no ambiente ou no banco de dados.

Essa escolha evita que uma chamada direta às APIs reative o fluxo por acidente e permite uma futura reativação explícita, sem remover o código de checkout.

## Experiência pública

O catálogo e as páginas de produto continuam públicos. Em vez de adicionar itens ao carrinho, o cliente vê a chamada:

> Vendas online indisponíveis no momento; compre pelo atendimento/PDV.

Cada chamada tem um botão de WhatsApp que usa o número configurado em `StoreSettings.whatsapp`. Nas páginas de produto, a mensagem do WhatsApp inclui a identificação do produto para orientar o atendimento.

O menu público não exibe o carrinho. Acessos diretos a `/cart`, `/checkout`, `/checkout/success` e `/checkout/cancel` mostram a mesma mensagem e o mesmo caminho de contato, sem recuperar ou alterar o carrinho do visitante.

## Proteção no servidor

Antes de criar pedido, preferência, consulta ou processar efeito de pagamento, as rotas de vendas online verificam o controle operacional. Quando desativadas, respondem com erro de serviço indisponível, usando um código de aplicação estável para o front (`ONLINE_SALES_UNAVAILABLE`).

As rotas abrangidas são o checkout e as rotas Mercado Pago. A rota de webhook não consulta o Mercado Pago, não altera pedido, estoque ou pagamento quando a operação online estiver desligada.

O PDV, seus métodos de pagamento presenciais e seus endpoints não usam esse controle e permanecem operacionais.

## Configuração e segurança

`ONLINE_SALES_ENABLED` é lida exclusivamente no servidor e tem padrão seguro: desativado quando ausente ou inválida. O deployment do homelab a define explicitamente como `false`.

O front não recebe nem depende de segredo Mercado Pago. O número do WhatsApp é obtido da configuração pública já existente; componentes que ainda usam número fixo devem passar a usar a mesma origem antes do novo botão ser reutilizado.

## Critérios de aceitação

- Produtos não oferecem adicionar ao carrinho nem checkout; oferecem WhatsApp com mensagem contextual.
- O carrinho deixa de aparecer no menu público.
- Rotas públicas antigas de compra mostram uma tela amigável e não iniciam venda.
- Chamadas diretas às APIs online são bloqueadas antes de qualquer escrita ou chamada ao Mercado Pago.
- PDV continua aceitando vendas presenciais normalmente.
- O bloqueio é coberto por teste automatizado; lint, build e uma verificação autenticada de PDV passam antes da publicação.
- A validação pós-deploy confirma catálogo e WhatsApp públicos, bloqueio da API, login/PDV autenticado e ausência de criação de pedido nas tentativas bloqueadas.

## Fora de escopo

- Excluir o código Mercado Pago ou o histórico de pedidos existentes.
- Alterar credenciais Mercado Pago, estoque, clientes, pedidos ou métodos de pagamento do PDV.
- Reativar vendas online ou executar pagamentos de teste.

## Reativação futura

A reativação exige uma mudança consciente de `ONLINE_SALES_ENABLED` para `true`, configuração válida de credenciais e webhook Mercado Pago, e nova validação completa de checkout, pagamento e reconciliação de estoque. Não basta alterar o front-end.
