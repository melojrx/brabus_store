# Validação da implementação — acesso a custos

Data: 10/10/2026. Branch: codex/restrict-product-costs, derivada da main em 9cbb1ba5fce930240faf1de01da974f03f1ddc0d. Implementação inline no checkout /home/jrmelo/Projetos/brabus_store. Especificação aprovada pelo usuário antes das mudanças.

## Resultado funcional

- Catálogo público omite costPrice para visitantes, clientes, vendedores e ADMIN.
- Vendedor mantém cadastro/edição de produtos, preço de venda, variantes, estoque e PDV. Suas telas e respostas não incluem custo ou margem.
- Cadastro por vendedor cria custo null; edição sem o campo preserva custo existente, inclusive zero. Tentativa explícita de gravar custo é negada com 403 antes de qualquer gravação.
- ADMIN mantém leitura e escrita de custos e margem na tela; produto sem custo aparece como “Não informado”.
- APIs de usuários e chaves são exclusivas de ADMIN, incluindo reset de senha, promoção de perfil e revogação de chaves.
- Papel e troca obrigatória de senha são lidos novamente no banco em cada avaliação da sessão. Sessão de ADMIN rebaixado para SELLER perde acesso à próxima requisição.
- Integrações precisam de read:costs para ler costPrice/unitCost e dashboard financeiro; write:costs é independente e necessário para gravar custo de produto.
- Dashboard administrativo indica vendas com custo histórico ausente. Custo zero não gera o aviso; cálculos e snapshots históricos não foram alterados.

## Evidências de teste

| Verificação | Resultado |
|---|---|
| Base anterior à implementação | 88 testes unitários + 11 de navegador passaram |
| Novos cenários antes das correções | 14 falharam por exposição/acesso/preservação incorretos; PDV existente passou |
| Testes unitários focados após correção | 16 passaram |
| Novos cenários focados após correção | 15 passaram |
| Suite unitária final | 95 passaram; zero falhas |
| Suite completa de navegador final | 29 passaram; zero falhas; 27,3 segundos |
| npm run build | Passou, exit code 0 |
| npm run lint -- . | Passou, zero erros; um aviso preexistente |
| npx tsc --noEmit | Passou |
| test-server-action-guard.sh | Passou |
| test-ci-test-environment.sh | Passou |
| git diff --check | Passou |

Aviso de lint preservado: app/admin/integrations/webhooks/[id]/DeliveriesManager.tsx:42 — dependência fetchDeliveries no useEffect. Há avisos de configuração de cor do terminal nos logs do Playwright; não são falhas da aplicação.

Os testes novos foram escritos e executados antes das mudanças de comportamento. A primeira preparação de navegador teve erro de tipagem na limpeza da fixture sintética, corrigido antes de medir as falhas esperadas. O primeiro teste da nova função de política falhou por módulo inexistente, como previsto pelo plano. As falhas de comportamento de catálogo/formulário também foram observadas antes de implementar.

## Cobertura da especificação

| Critério | Verificação |
|---|---|
| Público/CUSTOMER sem custo | APIs de lista/detalhe/destaques, HTML inicial e respostas RSC |
| SELLER sem custo | API de produtos, listagem, cadastro/edição e respostas RSC |
| Cadastro e edição operacionais | API e formulário reais; custo conhecido/zero preservados; variante e estoque conferidos |
| Negação de escrita de custo | POST/PUT com null/zero/valor, 403 e dados do banco intactos |
| ADMIN mantém operação financeira | Leitura na API, campo/margem na tela, gravação pelo formulário |
| Administração protegida | Vendedor negado em usuários/reset/chaves/revoke; ADMIN permitido nas mesmas operações |
| Sessão após rebaixamento | Mesma sessão perde custos/dashboard/administração após mudança no banco sintético |
| Integrações com acesso explícito | Produtos, pedidos, POST/PUT e dashboard; leitura/escrita independentes |
| Operação sem regressão nos cenários executados | PDV com estoque decrementado e snapshot interno; testes existentes de fiado/desconto; layout de PDV/dashboard |
| Custo ausente diferente de zero | Contador unitário, aviso administrativo real e preservação do histórico |
| Gates locais e revisão | Suite/lint/build/typecheck/scripts/diff; revisão inline contra a spec |

## Ambiente sintético

PostgreSQL 16 em brabus-cost-access-test, banco brabus_cost_access_e2e, acessível apenas por 127.0.0.1:55433. Container independente, sem volume de desenvolvimento. Migrações existentes e seed demonstrativo, sem dados reais. Segredo de autenticação, pepper e chaves de API sintéticos. Credenciais externas sobrescritas com valores vazios nos processos de teste. Nenhuma chave, conta ou banco de produção foi alterado.

Servidor de navegador em 127.0.0.1:3100 encerrado pelo runner. Fixtures específicas removidas ao final dos testes. Container sintético preservado para reproduzir a validação.

## Compatibilidade e publicação futura

A retirada de campos financeiros de respostas sem autorização é intencional. Antes de uma futura publicação, ADMIN precisa identificar as integrações legítimas que dependem de custos e emitir chaves com read:costs e/ou write:costs. Dashboard de integração precisa também de read:dashboard. Chaves antigas não recebem privilégios novos automaticamente. Nenhuma atualização de chave real foi executada.

Não há novos perfis, aprovação de cadastro, migrations ou dependências. Não foram encontrados exportadores CSV/XLSX/PDF; nenhum foi criado. Exportadores futuros devem usar projeção autorizada, nunca registros Prisma completos.

A validação local demonstra ausência de regressões na cobertura executada; não representa garantia absoluta para fluxos não testados. A verificação em produção e o ajuste de consumidores de integração pertencem a uma publicação futura. Esta entrega não realizou push, merge ou deploy.
