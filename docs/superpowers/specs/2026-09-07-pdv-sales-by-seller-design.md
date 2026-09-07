# Relatório de vendas PDV por vendedor

## Objetivo

Disponibilizar ao administrador um ranking de vendas por vendedor na aba **Comercial** do Dashboard, usando o mesmo recorte de período já existente.

## Escopo e regra de inclusão

Uma venda entra no relatório somente quando todas as condições forem atendidas:

- o pedido pertence ao canal `PDV`;
- possui `sellerId` e vendedor relacionado;
- possui status `PAID`, `SHIPPED` ou `DELIVERED`;
- foi criado dentro do período selecionado no Dashboard.

Pedidos online, legados, pendentes, cancelados, estornados e pedidos de PDV sem vendedor ficam fora. Não haverá atribuição retroativa de pedidos históricos sem vendedor.

## Métricas e tratamento financeiro

Cada linha apresenta **Vendedor**, **Pedidos**, **Faturamento** e **Ticket Médio**, em ordem decrescente de faturamento.

O faturamento é a soma de `Order.total` das vendas elegíveis. Uma venda Fiado conta pelo valor vendido ao ser entregue, ainda que seu título esteja aberto ou parcialmente quitado. Os recebimentos de títulos não entram neste ranking, pois representam caixa e não uma nova venda.

## Arquitetura

- `getAdminDashboardData` buscará a relação mínima do vendedor nos pedidos já usados para o Dashboard.
- O agrupamento será feito em memória junto às demais métricas comerciais, sem alteração de schema ou migração.
- A aba **Comercial** renderizará uma tabela seguindo o padrão de Top Clientes e Produtos Mais Vendidos.
- O Dashboard continua exclusivo de usuários `ADMIN`.

## Validação

- Testes cobrirão canal PDV, vendedor ausente, status não elegível, faturamento acumulado e ticket médio.
- A suíte, lint e build devem passar sem novos avisos.
