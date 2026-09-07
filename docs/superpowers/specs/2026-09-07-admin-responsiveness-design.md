# Responsividade operacional do Admin e PDV

## Objetivo

Eliminar cortes de conteúdo operacional no Admin, com prioridade para o PDV em notebooks, e estabelecer um contrato de responsividade que previna a mesma regressão no Dashboard.

O resultado deve manter produtos, cliente, pedido, entrega e pagamento acessíveis em toda largura suportada, sem alterar regras de venda, estoque, cliente, pagamento ou títulos.

## Diagnóstico que orienta a mudança

O PDV inicia em modo **Tabela**. A tabela de produtos possui larguras mínimas para produto, categoria e variantes. Quando a grade principal passa a usar duas colunas a partir de `xl` (1280 px), a coluna de produtos herda essa largura mínima e deixa de encolher. A coluna de cliente e pedido é então deslocada para fora da área visível.

O defeito foi reproduzido em 1280 px, 1366 px e 1440 px com o menu lateral recolhido. Em 1536 px, ele reaparece se o menu lateral for expandido. O modo **Cards** não produz o corte, confirmando que a tabela é a origem da pressão de largura.

O Dashboard e as telas administrativas amostradas não apresentam estouro no contêiner principal. Seus gráficos e tabelas já usam rolagem local; essa estratégia deve ser preservada.

## Escopo

Incluído nesta rodada:

- corrigir a composição de duas colunas do PDV;
- garantir que a tabela de produtos role apenas dentro de seu próprio quadro;
- manter todos os painéis do PDV visíveis com o menu lateral recolhido ou expandido;
- formalizar verificações de responsividade para PDV e Dashboard;
- adicionar uma infraestrutura mínima de testes de navegador para esse contrato visual.

Fora do escopo:

- redesenhar tabelas de Produtos, Clientes, Pedidos, Vendedores, Fornecedores ou outros cadastros;
- alterar dados, schema Prisma, APIs, autenticação ou regras financeiras;
- mudar a experiência visual, métricas ou dados do Dashboard;
- alterar a responsividade da loja pública.

## Contrato de responsividade

### Administração como contêiner

- A área principal do Admin não pode receber rolagem horizontal por conteúdo interno.
- O cálculo de espaço deve considerar a largura efetivamente disponível após o menu lateral, esteja ele recolhido ou expandido.
- Conteúdo denso, como tabela e gráfico, pode rolar horizontalmente somente no seu contêiner próprio.
- Não será usado `overflow-x-hidden` como correção: ocultar conteúdo não acessível é uma regressão, não uma solução.

### PDV

- Até 1279 px, o PDV continua em uma coluna: catálogo primeiro; cliente, pedido, entrega e pagamento em seguida.
- A partir de 1280 px, catálogo e operação de venda devem ficar lado a lado, com duas colunas que possam encolher dentro da largura real disponível.
- A grade de duas colunas deve usar faixas que permitam redução (`minmax(0, ...)`) e os dois painéis diretos devem aceitar encolhimento (`min-w-0`).
- A coluna operacional mantém largura mínima de 20 rem (320 px), sem sair da tela. A coluna de catálogo absorve a largura restante.
- A tabela de produtos fica limitada à largura da coluna do catálogo e usa rolagem horizontal própria. Suas larguras mínimas internas continuam válidas; não haverá compressão de colunas que prejudique leitura ou seleção de variantes.
- O modo **Cards** continua disponível e não muda de comportamento.
- O comportamento `sticky` e a altura controlada do catálogo permanecem apenas quando a composição em duas colunas couber; em uma coluna, a página segue com rolagem vertical normal.

### Dashboard e demais telas administrativas

- O Dashboard mantém suas grades adaptáveis, controles com quebra de linha e gráficos/tabelas com rolagem local quando necessária.
- A rodada não altera componentes de Dashboard, salvo ajustes estritamente necessários para cumprir o contrato de não estouro externo identificado pela nova suíte de navegador.
- As tabelas administrativas existentes continuam usando o padrão atual de rolagem local. Uma futura melhoria de UX poderá priorizar colunas, oferecer visualização em cartões ou fixar a primeira coluna, mas isso não faz parte desta entrega.

## Validação automatizada de navegador

Será adicionada uma estrutura mínima baseada em Playwright, exclusiva para esta necessidade de interface. Ela deve usar servidor e dados locais controlados, com autenticação de administrador reproduzível, sem depender de dados manuais nem acessar produção.

O teste do PDV deve validar os viewports abaixo, nos estados de menu recolhido e expandido:

| Viewport | Finalidade |
| --- | --- |
| 1280 × 800 | Entrada no layout de duas colunas |
| 1366 × 768 | Notebook mais comum afetado |
| 1440 × 900 | Notebook amplo ainda afetado |
| 1536 × 900 | Caso que falhava com o menu expandido |

Para cada caso do PDV, a suíte deve assegurar que:

- a largura rolável da área principal é igual à largura visível, sem rolagem horizontal externa;
- o painel de cliente/pedido está inteiramente dentro da área visível;
- a tabela de produtos pode ter rolagem horizontal apenas no seu invólucro;
- controles essenciais de incluir cliente, pedido atual e pagamento continuam localizáveis e interativos.

O Dashboard terá uma checagem de não regressão nas abas Visão Geral, Financeiro, Comercial e Estoque. A verificação garante ausência de rolagem horizontal externa em um viewport de notebook e preserva a rolagem local de gráficos e tabelas quando existir.

## Validação manual

Antes da promoção, a revisão manual deve repetir os mesmos viewports e estados do menu lateral, usando o catálogo em **Tabela** e **Cards**. Deve incluir:

- localizar e selecionar uma variante;
- abrir e preencher o cliente, incluindo cadastro rápido quando necessário;
- revisar pedido, entrega e pagamento sem perder acesso a nenhum painel;
- confirmar que o Dashboard permanece legível nas quatro abas;
- verificar que a loja pública e as regras de venda não foram afetadas.

## Critérios de aceite

- Em todos os viewports definidos, nenhum painel operacional do PDV é cortado ou exige rolagem horizontal da área principal.
- Expandir e recolher o menu lateral não causa deslocamento externo no PDV.
- A tabela do catálogo continua legível e, quando exceder a coluna, rola apenas dentro de seu quadro.
- Dashboard não introduz rolagem horizontal externa em suas abas principais.
- A nova suíte de navegador passa em ambiente local controlado.
- A suíte existente, lint e build passam sem novos avisos ou erros.
- Não há migração, alteração de banco de dados ou mudança em regras de negócio.

## Riscos e decisões

- A introdução do Playwright adiciona configuração de ambiente de testes. O benefício é transformar uma regressão visual de notebook em falha reproduzível antes da promoção.
- O escopo evita uma reescrita ampla das tabelas administrativas. Isso reduz risco e tempo agora, preservando uma evolução de UX posterior para tabelas densas.
- O uso de rolagem local é intencional para dados tabulares; a solução não deve esconder conteúdo nem reduzir informações de negócio para aparentar que a tela cabe.
