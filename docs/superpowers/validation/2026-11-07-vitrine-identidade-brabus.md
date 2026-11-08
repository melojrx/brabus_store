# Validação — identidade Brabu’s

Data de referência: 2026-11-07 (America/Fortaleza).
Branch: `codex/vitrine-identidade-brabus`.
Base: `main` local, `2c5cecb`.

## Baseline antes da implementação

- `npm test`: 102 testes, 102 aprovados, zero falhas.
- `npm run lint -- .`: zero erros, um aviso preexistente de `react-hooks/exhaustive-deps` em `app/admin/integrations/webhooks/[id]/DeliveriesManager.tsx:42` (`fetchDeliveries`).
- `npm run build`: build de produção concluído; resultado final confirmado pelo processo com exit code 0.
- Existe suite automatizada, embora a descrição de testes do `AGENTS.md` ainda diga que não há suite. Usar os comandos reais de `package.json`; não ampliar o escopo para corrigir documentação geral.
- Prévia visual anterior inspecionada: home, catálogo, detalhe, loja e contato. Captura anexada pelo usuário documenta as três imagens de categorias anteriores. Baseline visual autenticado do PDV ainda precisa ser registrado antes de sua alteração.
- `outputs/` já estava não rastreado antes deste trabalho; não adicionar seu conteúdo ao commit.
- Sem alterações de aplicação, banco, autenticação ou produção nesta fase documental.

## Gates

| Gate | Estado | Evidência necessária |
| --- | --- | --- |
| G0 | Spec e plano aprovados | Usuário autorizou implementar até G2 e mostrar antes de avançar |
| G1 | Verificado | 104 testes, lint sem erros, build aprovado; tema público isolado |
| G2 | Implementado e tecnicamente verificado; aguardando aceite visual | Cabeçalho/hero/faixa disponíveis no localhost |
| G3 | Não iniciado | Categorias/cards testados e aceitos visualmente |
| G4 | Não iniciado | PDV: marca/paleta, regressões e comparação antes/depois |
| G5 | Não iniciado | Ativos finais, checks e aceite local completo |

## Registro de execução por fase

Ao executar, acrescentar comandos, resultado, commit e caminhos das screenshots. Registrar falhas novas separadamente das preexistentes e manter o gate aberto enquanto houver falha atribuível à alteração.

### G1 — tema e ativos

- Teste novo executado antes da implementação: falha por módulo de política inexistente. Depois: dois casos aprovados, incluindo exclusão de rotas administrativas e prefixos parecidos.
- `npm test`: 104/104; lint: zero erros e aviso preexistente; build: exit code 0.
- Browser local: home com `--color-primary: #D4A346` e Bebas Neue resolvida por next/font. Navegação para login com `#C9A84C`, sem `.theme-storefront`, e retorno para home. Demais rotas administrativas cobertas pela política, sem validação autenticada nesta fase.
- PDV classificado separadamente, mas classe/paleta nova não ativada. Dados/queries permanecem no servidor; Providers e children mantidos sob boundary estável.
- Commit G1: `a8ef177`.

### G2 — cabeçalho, hero e faixa

- Componentes criados: `BrandLogo`, `StorefrontHero`, `StorefrontInfoStrip`. Dados de endereço e Instagram vêm de `StoreSettings`. Assinatura horizontal e emblema servidos dos WebP locais; rotas de categoria e regras de compra preservadas.
- Novos testes de renderização executados antes dos componentes: falha esperada por módulos inexistentes; após implementar, três testes aprovados (assinatura acessível, rotas/arte do hero e settings dinâmicos da faixa).
- `npm test`: 107/107; `npm run lint -- .`: zero erros e mesmo aviso preexistente; `npm run build`: exit code 0; `git diff --check`: sem problemas.
- Ajuste do plano de testes: `DATABASE_URL_E2E` não está configurada. Não executar o runner que faz migrations/seed na base de trabalho. Nesta fase, validação por testes automatizados de renderização reais e interações read-only no navegador local. Suite Playwright `_e2e` e testes autenticados/transacionais não executados e não declarados aprovados.
- Navegador: 375 × 812, 768 × 1024 e 1440 × 900, sem overflow horizontal e com imagens carregadas. Menu móvel abre e fecha por Escape, foco visível, CTAs com 52 px de altura; destino de Moda masculina confirmado em `/products?category=roupas-fitness`, com catálogo filtrado carregado.
- `prefers-reduced-motion: reduce` emulado no navegador: media query ativa, transições com duração 0s, sem overflow; emulação restaurada depois.
- Modo de vendas local continua sem carrinho e com ações de WhatsApp nos produtos. Não enviar mensagens. Login e rotas fora da vitrine continuam com tema legado; menus de conta autenticada não exercitados nesta fase.
- Capturas: `outputs/vitrine-identidade-brabus/g2-desktop.jpg`, `g2-tablet.jpg`, `g2-mobile.jpg`. Baseline anterior: `antes-desktop.jpg`. Capturas fora do commit.
- Sem mudança de queries, cadastro de produtos, categorias, cards, PDV ou banco. A herança de cores/fontes nas páginas públicas é parte do tema aprovado; componentes das fases posteriores continuam os anteriores.
- Gate visual G2 aberto. Não iniciar G3/G4 antes da avaliação do usuário.

### Revisão G2 em 2026-11-08 — assinatura integrada

- Usuário autorizou trocar o medalhão pela arte “Força de Verdade” com transparência e decoração estática de fumaça/brasas. Registro, prompts e fontes em `docs/brand/2026-11-08-hero-integrada.md`.
- Teste ajustado antes da implementação: um caso falhou por ainda usar a imagem circular; após implementar, suite completa com 107/107, lint sem erros (mesmo aviso) e build aprovado.
- Servidor dev reiniciado após confirmar CSS antigo em memória; computados novos inspecionados antes de registrar as capturas.
- G2 continua aguardando avaliação visual. Cabeçalho, faixa, categorias, cards e PDV não receberam novas alterações nesta revisão.

## Restrições de teste

Não usar credenciais de fixtures em banco real por suposição. O runner existente exige `DATABASE_URL_E2E` com banco terminado em `_e2e` e aplica migrations/seed apenas nessa base. Testes que criam vendas, clientes ou alteram estoque executam somente ali. Ausência desse banco é bloqueio de testes transacionais, não autorização para usar a base de trabalho.

## Preparação dos ativos autorizada posteriormente

- Seis ativos selecionados em `public/brand/`, cada um com PNG e WebP; fontes/prompts em `docs/brand/2026-11-07-vitrine-assets-production.md`.
- Logo horizontal e emblema com alpha real; compacto fiel ao original, opaco, porque as duas tentativas de extração ficaram com resíduos.
- Categorias de roupas e bonés derivadas das referências; suplementos com editorial genérico provisório, sem rótulos. Aceite visual pendente.
- Decodificação e dimensões dos seis pares PNG/WebP conferidas; alpha preservado nos dois logos transparentes.
- Após preparar ativos: `npm test` com 102/102 aprovados; `npm run lint -- .` com zero erros e mesmo aviso preexistente; `npm run build` com exit code 0; `git diff --check` sem problemas.
- Nenhum consumidor/layout/fluxo da aplicação foi alterado. Preparação de imagens não conclui G1–G5.


## G3 — Categorias e cards (08/11/2026)

- Usuário aprovou a hero integrada/G2 e autorizou G3 com parada antes do PDV.
- Baseline: 107/107 testes (`/tmp/brabus-g3-baseline.log`). Cinco contratos de renderização adicionados antes dos componentes; falha inicial por módulo ausente (`/tmp/brabus-g3-red.log`), depois 4/4 aprovados. Caso adicional para o caminho legado `/placeholder.jpg` falhou por ausência do fallback textual e passou após correção (`/tmp/brabus-g3-placeholder-red.log`).
- Resultado final: `npm test` 112/112; `npm run lint -- .` zero erros, aviso preexistente em DeliveriesManager.tsx:42; `npm run build` exit 0. Logs `/tmp/brabus-g3-tests.log`, `/tmp/brabus-g3-lint.log`, `/tmp/brabus-g3-build.log`. `git diff --check` sem erros.
- Novos componentes servidor ObjectiveCategories e ProductCard. Mapa de imagens em lib/brand-assets.ts; consultas e dados comerciais preservados. CSS de apresentação só consumido na vitrine; nenhuma alteração no PDV.
- Categorias: fotos locais 4:3 de roupas masculinas, bonés e suplementos. Título e descrição abaixo da foto, sempre visíveis. Categorias não curadas mantêm nome e descrição próprios com ícone neutro. Suplementos continuam composição editorial genérica provisória, sem alegação de SKU real.
- Cards: mídia quadrada com `object-fit: contain`, nome em até duas linhas abaixo da mídia, preço separado e ação fora dos links. Badges de estoque têm prioridade sobre Novo. Foto ausente ou caminho legado placeholder.jpg recebe texto “Imagem indisponível”. Imagens existentes do catálogo não foram substituídas por composição editorial.
- Navegador local: home sem overflow em CSS 375, 768 e 1440 px; catálogo sem overflow em 375 px. Em 375 px, ações de produto medem 44 px e nomes ficam abaixo da mídia. Em 1440 px, categorias medem ~408,7 × 306,5 px e fotos dos cards usam contain. Três imagens de categoria carregadas.
- Fluxos read-only: link Moda masculina mantém roupas-fitness; páginas 1/2 do catálogo; busca Regata com ordenação por menor preço mostra R$ 36,90 e R$ 59,90; busca zz-sem-resultado-g3 mostra estado vazio; nome do card abre Regata Marchão Brabu’s com R$ 36,90, estoque 7 e link WhatsApp do produto, sem enviar mensagem. Durante emulação CDP, cliques tiveram coordenadas inconsistentes; verificações de interação foram concluídas após limpar a emulação e usar viewport normal. Overrides temporários removidos ao final.
- Sem DATABASE_URL_E2E: runner Playwright e testes transacionais não executados; nenhum seed, migration ou compra no banco local.
- O catálogo local contém itens femininos de demonstração e muitos produtos sem foto cadastrada. Esses dados foram preservados, não representam aprovação editorial da linha de produtos.
- Screenshots locais não versionados: outputs/vitrine-identidade-brabus/g3-desktop.jpg, g3-categorias-mobile.jpg e g3-cards-mobile.jpg. Home mantida aberta em http://localhost:3000/ para avaliação.
- Gate: implementação tecnicamente verificada, composição e imagens aguardam aceite visual. G4/PDV não iniciado; sem merge, push ou deploy.


## G4 — PDV com logo e paleta (08/11/2026)

- G3 aprovado visualmente; usuário autorizou G4 limitado a logo/paleta e solicitou novo G5 (footer, Loja Física e Contato). CEP 62750-000 e substituição da foto por endereço + mapa registrados para G5, ainda não implementados.
- Banco novo `brabus_brand_e2e` criado no Postgres Docker local existente, porta 5433. URL derivada da conexão local, mantida somente no ambiente dos processos; `.env` e banco de trabalho não alterados. Migrations e seed executados exclusivamente no `_e2e`.
- Baseline: 112 testes aprovados; build aprovado. Teste Playwright de captura autenticada executado antes de alterar componentes/CSS, com 1280×800 e 1366×768, sidebar recolhida/expandida. Capturas e geometria em outputs/vitrine-identidade-brabus/g4-antes-*.jpg e g4-baseline-geometria.json. Capturas iniciais de CUA com zoom não tinham CSS viewport correto e foram substituídas pelas capturas automatizadas verificadas.
- Teste novo da assinatura falhou antes da implementação por ausência da imagem oficial (`/tmp/brabus-g4-red.log`). Após implementação, a primeira execução encontrou apenas diferença de caixa na serialização CSS do hex; comparação corrigida para ignorar caixa, sem alteração funcional.
- Mudança de produção em quatro arquivos: BrandTheme ativa `.theme-pdv` na rota exata já classificada; Navbar usa a assinatura existente; BrandLogo ganha variante de 128×40 dentro da linha anterior; CSS muda apenas tokens de cor e tamanho da assinatura. Sem tipografia nova, hero, categorias, tabelas, handlers, endpoints ou lógica de venda no PDV. Cores semânticas secundárias/pagamento/erro preservadas. Outras telas admin continuam legadas.
- Resultado: 112/112 testes no banco isolado (`/tmp/brabus-g4-tests-isolated.log`); lint sem erros e único aviso preexistente em DeliveriesManager.tsx:42; build exit 0 (`/tmp/brabus-g4-build.log`). `git diff --check` sem erros.
- E2E final: quatro arquivos selecionados, 14 testes aprovados, um teste de captura de baseline intencionalmente ignorado após implementação. Log `/tmp/brabus-g4-e2e-final.log`. Runner padrão de seed/build usado na primeira rodada (`/tmp/brabus-g4-e2e.log`); rodada final reutilizou a mesma prévia de produção e banco isolado, sem novo seed, com config temporária em outputs/g4-preview.config.ts. Novos testes em tests/e2e/pdv-brand.spec.ts.
- Cobertura: oito combinações de viewport/sidebar (1280/1366/1440/1536), painel de checkout dentro do admin, rolagem da tabela contida, dashboard legado; acesso de vendedor; venda sintética via API com baixa correta de estoque e custo histórico preservado; UI de quantidade, desconto, cliente e seleção de Dinheiro/Pix/Débito/Crédito/Fiado. Quantidade 2 de creatina totaliza R$99,80; desconto R$5 totaliza R$94,80; Fiado sem cliente bloqueia conclusão. Testes de fiado e domínio também estão na suite de 112. Não se declara teste de ponta a ponta de cada meio de pagamento.
- Comparação CUA em CSS 1366×768, sidebar recolhida: cabeçalho 74px antes/depois; checkout x=834.828125, y=299, largura=499.15625, altura=1810 antes/depois; fonte Inter, sans-serif inalterada. Paleta computada #d4a346, logo carregada, sem overflow no admin.
- Prévia visível autenticada em http://localhost:3100/admin/pdv, banco sintético separado. A porta 3000 continua sendo a instância de trabalho com o mesmo código. Sessão antiga da captura perdeu validade após novo seed (IDs das fixtures recriados); sessão limpa usada na prévia localhost. Nenhuma mudança de autenticação realizada.
- Captura final: outputs/vitrine-identidade-brabus/g4-pdv-depois.jpg. Overrides temporários de viewport/emulação restaurados. Sem merge/push/deploy. G4 aguarda avaliação visual; G5/G6 não iniciados.

## G5 — Footer, Loja Física e Contato (08/11/2026)

- Usuário aprovou G4 e autorizou G5. Não avançar ao G6 antes da avaliação destas páginas.
- Baseline: 112/112 testes no banco separado brabus_brand_e2e (`/tmp/brabus-g5-baseline.log`). Quatro contratos de renderização adicionados antes da implementação; falha por módulo ausente em `/tmp/brabus-g5-red.log`, depois todos aprovados. Resultado final: 116/116 (`/tmp/brabus-g5-tests.log`), lint sem erros com o aviso preexistente, build concluído (`/tmp/brabus-g5-build.log` e build do runner final).
- Componentes servidor recebem settings públicos; páginas de Loja Física e Contato mantêm consultas no servidor. FooterTheme é a única seleção cliente e reutiliza a política de rotas; footer novo só aparece nas rotas públicas já delimitadas. LegacyFooter preserva a apresentação anterior no PDV, admin, autenticação e conta.
- Footer público: logo oficial, paleta grafite/dourado, endereço e WhatsApp configurados, Instagram com nome acessível e links úteis. Loja Física: foto fictícia removida, endereço à esquerda e iframe à direita, empilhados no celular; horário vem de openingHours, sem horários adicionais inventados. Contato: cartões reais de WhatsApp, Instagram e e-mail; removido o formulário anterior sem handler cujo botão não enviava nada. E-mail anterior contato@brabusstore.com preservado, sem alegar validação de entrega desse endereço.
- Correção comercial autorizada no banco local de trabalho: um único registro de StoreSettings atualizado de CEP 62765-000 para 62750-000, além dos campos googleMapsUrl/googleMapsEmbed desse mesmo registro para o mapa. Nenhum seed, migration ou cadastro de produto alterado na base de trabalho. Fallback público e valor explícito do seed agora usam 62750-000. O default histórico do schema/banco não recebeu migration nesta fase; cadastro atual e fixtures têm valor explícito corrigido.
- A busca Google pelo texto da rua retornou “Correspondências parciais” (Antônio Felício/Antônio Alves da Rocha), portanto o primeiro mapa foi rejeitado. Usuário reconfirmou Rua Antônio Lopes, 571 — Conjunto Cohab — Aracoiaba — CE. Busca no Google Maps pelo nome Brabu’s encontrou “Brabus Conveniência”, com endereço Av. Antônio Lopes da Silva, 571 — Aracoiaba, CE, 62750-000. Site Kyte da marca também identifica Av. Antonio Lopes 571, conjunto Cohab. Usado o iframe obtido por Compartilhar → Incorporar um mapa desse cadastro, sem inventar coordenadas ou mudar o endereço exibido. Nome/endereço de origem, URL e estado pendente de confirmação visual em docs/brand/store-location-map.json. Confirmar a correspondência física no gate; não se afirma existir perfil Google separado para Performance Store.
- Fontes públicas de localização: https://brabus.kyte.site/en e URL Google Maps registrada no JSON. Referência de incorporação: https://developers.google.com/maps/documentation/embed/embedding-map . Nenhum telefone/horário da Conveniência substituiu os dados configurados da Performance Store.
- Helpers aceitam URLs HTTPS de Google Maps e links curtos de mapas; entradas inválidas recebem fallback por endereço. Iframe com título acessível, lazy loading, dimensões reservadas, sem filtro CSS nos rótulos do mapa. Botão abre o mesmo cadastro configurado.
- E2E em banco isolado pelo runner padrão: seis testes de navegador aprovados; um caso de captura do baseline G4 intencionalmente ignorado. Cobertura de Loja Física/Contato/footer em 375/768/1440, CEP, assinatura, links, ausência da foto/formulário inerte, mapa lateral/empilhado, isolamento de footer no PDV e regressões de logo/paleta/controles do PDV. Logs `/tmp/brabus-g5-e2e-final.log`, `/tmp/brabus-g5-lint.log`. Não foram enviadas mensagens/e-mails nem efetuadas compras nesta fase.
- CUA na instância de trabalho porta 3000: mapa Google carregado, páginas sem overflow em 375/768/1440; endereço e mapa empilhados em 375. Capturas em outputs/vitrine-identidade-brabus/g5-loja-desktop.jpg, g5-loja-mobile.jpg, g5-contato-footer-desktop.jpg e g5-contato-mobile.jpg (não versionadas). Verificação de conteúdo/links no DOM e apresentação visual.
- G5 tecnicamente implementado e aguardando aceite visual, especialmente ponto do mapa e e-mail preservado. G6 não iniciado; sem merge, push ou deploy.
