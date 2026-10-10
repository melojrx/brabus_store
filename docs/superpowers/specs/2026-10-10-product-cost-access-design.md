# Ocultação de custos por perfil — especificação

Data: 2026-10-10. Repositório: `/home/jrmelo/Projetos/brabus_store`.
Base inspecionada: `main`, commit `9cbb1ba5fce930240faf1de01da974f03f1ddc0d`.
Branch de trabalho: `codex/restrict-product-costs`, criada da `main` no checkout atual.
Estado: especificação escrita; aguardando revisão do usuário antes de alterar comportamento.

## Objetivo e decisão

Vendedores continuam cadastrando e editando produtos, consultando estoque e usando o PDV. Somente ADMIN consulta ou altera custos no painel. O catálogo público nunca retorna custos, mesmo quando aberto por um administrador.

Usar os perfis existentes ADMIN, SELLER e CUSTOMER. Não criar perfil de gestor, plataforma de permissões, pré-cadastro ou aprovação de produtos. Neste sistema, quem precisa gerenciar custos utiliza ADMIN.

Alternativas consideradas: esconder apenas na tela tem esforço menor, mas mantém a exposição nas respostas; criar permissões configuráveis e aprovação amplia a manutenção e altera a operação; a escolha aprovada em conversa é aplicar a regra aos perfis atuais no servidor e nas telas.

## Restrições globais

- Execução inline, sem subagents e sem worktree separado.
- Trabalhar na branch `codex/restrict-product-costs`, derivada da `main`.
- Testar primeiro localmente com dados sintéticos; escrever testes de regressão antes das mudanças de comportamento.
- Não realizar push, merge, deploy ou alterações em produção nesta entrega.
- Não usar dados reais, credenciais reais, chaves de integração reais ou serviços de pagamento/notificação nos testes.
- Não criar migração de banco, novos perfis ou dependências para esta funcionalidade.
- Preservar preço de venda, estoque, variantes, filtros, imagens, PDV, pedidos e fiado.
- Preservar `Product.costPrice` e o custo histórico `OrderItem.unitCost` no banco.
- Fazer somente ajustes necessários à proteção de custos e à validação dessa proteção.

## Regras de acesso

| Operação | ADMIN | SELLER | Público/CUSTOMER |
|---|---|---|---|
| Catálogo público | Sem custo | Sem custo | Sem custo |
| Produtos no painel | Com custo e margem | Sem custo e margem | Sem acesso |
| Cadastrar produto | Fluxo atual com custo | Cadastro direto sem custo | Sem acesso |
| Editar dados operacionais | Permitido | Permitido | Sem acesso |
| Enviar alteração de custo | Permitido | 403, sem gravar nada | Sem acesso |
| Dashboard financeiro | Permitido | Negado como hoje | Negado |
| Administrar usuários e chaves | Permitido | Negado no backend | Negado |

Ausência de `costPrice` em uma edição significa preservar o custo existente, inclusive para ADMIN. Presença explícita de `costPrice` enviada por SELLER, mesmo `null`, deve produzir 403 antes de qualquer gravação. Um novo produto criado sem custo mantém `costPrice = null`; não preencher com zero nem inferir valor.

As respostas de GET, POST e PUT devem respeitar a mesma regra. Para usuários sem acesso, a propriedade `costPrice` deve estar ausente, e não apenas ser substituída por `null`. O mesmo se aplica a `unitCost` e aos valores derivados em rotas que os exponham.

## Implementação proposta

### Produtos e páginas

`lib/catalog-api.ts` concentra a serialização. `serializeProduct` deve remover `costPrice` antes de espalhar propriedades e omitir custos por padrão. Uma opção explícita de inclusão será usada apenas após verificar ADMIN no servidor ou um scope específico de integração. Todos os usos em `map` serão lambdas explícitas, evitando que o índice da lista vire argumento de autorização.

Aplicar a regra em `app/api/admin/products/route.ts`, `app/api/admin/products/[id]/route.ts` e nas três páginas de produtos: listagem, cadastro e edição. As páginas consultam a sessão no servidor e passam apenas um booleano `canManageCosts` e os dados já filtrados ao componente cliente.

`ProductsManager.tsx` omite coluna, campo e margem para vendedor. `lib/product-form.ts` aceita uma opção explícita para dispensar a validação de custo e omitir o campo do payload nesses casos. O valor padrão dessas funções preserva o fluxo administrativo atual. Tipos de produto aceitam custo opcional.

Centralizar a proteção da escrita em uma função pequena em `lib/product-cost-access.ts`: detectar propriedade própria no corpo original, negar escrita sem autorização e retirar custo dos dados normalizados quando o campo não veio no pedido. Isso evita que a normalização atual transforme uma edição sem custo em `costPrice: null`.

### Proteção contra obtenção de acesso administrativo

Trocar o guard das rotas de usuários e de chaves por verificação de ADMIN, sem alterar `isStaffRole` globalmente. Abranger listagem/criação, alteração/remoção de usuário, redefinição de senha e revogação de chave. Vendedor autenticado recebe 403; visitante recebe 401. As páginas dessas áreas já possuem restrição administrativa.

Atualizar a leitura do papel no callback JWT de `auth.ts` com consulta ao usuário atual no banco. Uma sessão antiga de alguém rebaixado de ADMIN para SELLER não pode continuar lendo custos. Usuário removido recebe papel sem acesso administrativo; falha na consulta não pode liberar privilégio usando o papel antigo. Manter os campos atuais de sessão e o comportamento de troca obrigatória de senha.

### Integrações

Usar a infraestrutura existente de scopes: adicionar somente `read:costs` e `write:costs`, selecionáveis por ADMIN na tela de chaves. Não deduzir permissão pelo texto de `actor`.

- `read:products` e `read:orders` continuam operacionais, mas omitem `costPrice` e `unitCost` sem `read:costs`.
- Respostas de criação e edição de produtos também exigem `read:costs` para incluir custo; ter permissão de escrita não concede leitura implicitamente.
- Enviar custo com `write:products` exige também `write:costs`; sem isso, retornar 403 antes de gravar. Atualizar outros dados sem enviar custo preserva o custo existente.
- O endpoint de dashboard financeiro exige `read:dashboard` e `read:costs`, antes de consultar os dados, porque contém lucro, margem e valor de estoque. Não criar uma segunda versão operacional do dashboard.
- Não atribuir os novos scopes automaticamente às chaves existentes. Antes de uma futura publicação, ADMIN deve identificar as integrações legítimas que dependem de custos e emitir chaves adequadas. Nenhuma chave real será alterada ou revogada nesta entrega local.

**Compatibilidade:** a retirada de campos financeiros e a exigência dos novos scopes são mudanças intencionais do contrato de acesso. Integrações que atualmente usam esses campos precisarão de atualização coordenada antes de publicar. Esse efeito não deve ser apresentado como compatibilidade integral sem mudanças.

### Custos ainda não informados

O cadastro por vendedor pode gerar produtos com custo pendente. A listagem administrativa exibe “Não informado” para esse caso. Se uma venda possui `unitCost = null`, o dashboard administrativo mostra aviso de custos incompletos no período, com contagem dos itens afetados. Manter os cálculos atuais e indicar que lucro/margem podem estar superestimados; não reescrever custos históricos usando o custo atual do produto.

Esse aviso não bloqueia cadastro ou venda, não cria aprovação e não muda os indicadores quando os custos estão completos. Custo zero explicitamente informado é válido e não é custo ausente.

## Superfícies e limites

O serializer seguro cobre as APIs públicas de listagem/detalhe/destaques, página inicial e detalhe do produto, incluindo dados enviados a componentes cliente e respostas de navegação do Next.js. Testar essas superfícies mesmo sem um campo visível na tela.

PDV e resumo de pedido já usam seleção explícita de campos sem custo: preservar esses contratos e testar suas operações. O custo histórico continua sendo capturado internamente. O webhook de pedido pago continua usando os campos comerciais atuais.

Não foram encontrados exportadores CSV/XLSX/PDF na análise. Não construir exportação nesta entrega. Registrar que um futuro exportador deve consumir a projeção autorizada e nunca um registro Prisma completo. Dashboard financeiro permanece exclusivo de ADMIN; o endpoint equivalente de integração passa a exigir scope de custos.

## Dados e ambiente de teste

Banco descartável: `brabus_cost_access_e2e`, PostgreSQL 16, em `127.0.0.1:55433`, container `brabus-cost-access-test`. Sem montagem de volume do desenvolvimento. Migrações existentes e seed sintético executados somente nesse banco. Nunca usar a `.env` como destino implícito dos testes: substituir explicitamente DATABASE_URL e DATABASE_URL_E2E e usar segredo local sintético para autenticação.

Fixtures: ADMIN, SELLER, CUSTOMER; produto com custo conhecido; produto com custo zero; produto sem custo; variantes com estoque; pedido com custo histórico; chaves sintéticas com scopes operacionais, de leitura de custos e de escrita de custos. Valores sentinela devem ser distintos do preço de venda para facilitar a identificação de vazamentos.

## Critérios de aceite

1. Visitante, CUSTOMER e SELLER não recebem propriedade ou valor de custo pelo catálogo público, páginas HTML ou navegação de componentes do Next.js.
2. SELLER não recebe custo nas páginas ou respostas de produtos no painel, incluindo respostas após gravação.
3. SELLER cadastra produto sem custo e edita os demais dados sem apagar custo preexistente; custo zero é preservado.
4. POST/PUT malicioso de SELLER com custo retorna 403 e não muda nome, estoque, variantes nem custo.
5. ADMIN continua vendo e alterando custos; ausência do campo numa edição preserva o valor.
6. Vendedor não promove usuários, redefine senha de outro funcionário ou cria/consulta/revoga chaves; ações administrativas continuam funcionando para ADMIN.
7. Uma sessão de ADMIN rebaixado para SELLER perde acesso a custos na próxima requisição protegida.
8. Integrações operacionais continuam funcionando sem custo; as que têm scope explícito acessam custos; dashboard financeiro sem scope financeiro retorna 403.
9. Estoque, variantes, preço de venda, carrinho, PDV, pedidos, desconto e fiado passam nos testes de regressão existentes e nos cenários locais afetados.
10. Produto sem custo não é confundido com custo zero; vendas com custo ausente geram aviso administrativo e preservam os snapshots históricos.
11. Suite completa, lint e build executados no ambiente local; falhas preexistentes e limites de cobertura documentados. Não alegar garantia absoluta de ausência de regressões.

## Evidência inicial

Checkout limpo na main antes da criação da branch. Primeiro teste sem ambiente de teste encontrou banco indisponível em localhost:5433. Ao apontar para o banco descartável migrado ainda sem seed: 87 testes passaram e 1 falhou por falta de variante. Após o seed sintético, a repetição passou: 88 testes, zero falhas. Build inicial passou. Os 11 testes de navegador existentes passaram em 19,7 segundos, com aplicação local e banco sintético. Lint inicial: zero erros e um aviso preexistente em DeliveriesManager.tsx sobre dependência de useEffect. Esses resultados medem a base anterior à implementação; não validam ainda as novas restrições de custo.

## Revisão e entrega

Especificação e plano ficam versionados na branch e têm cópias em outputs deste chat. A revisão escrita exigida pela skill brainstorming antecede mudanças de comportamento. Após revisão, executar o plano inline com TDD e verificação local; registrar evidências e deixar a branch disponível para revisão, sem publicação automática.
