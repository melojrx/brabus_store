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
| G2 | Aprovado pelo usuário | Cabeçalho/hero/faixa, hero integrado com atmosfera estática |
| G3 | Aprovado pelo usuário | Categorias masculinas/bonés/suplementos e cards compartilhados |
| G4 | Aprovado pelo usuário | PDV restrito a marca/paleta; fluxos e layout preservados |
| G5 | Aprovado pelo usuário em 2026-11-08 | Footer, Loja Física, Contato, mapa escuro/pino e CEP |
| G6 | Concluído e publicado em 2026-11-08 | Revisão sem bloqueadores, 116 testes, 38 E2E, build/lint e smoke público aprovados |

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

### Revisão G5 — marcador com emblema

Usuário escolheu mapa interativo OpenStreetMap com marcador oficial e botão Google Maps preservado. StoreMap carrega Leaflet 1.9.4 por import dinâmico no cliente, usa as coordenadas verificadas do cadastro Google (-4.3712974, -38.8085008) registradas no JSON e o emblema local; marcador acompanha o zoom e deslocamento. Atribuição OSM visível, tiles HTTPS com cache padrão do navegador, sem prefetch; provedor substituível por NEXT_PUBLIC_MAP_TILE_URL (preservar atribuição apropriada ao trocar provedor). Sem API key, geolocalização do visitante ou mudança de PDV. Animações desativadas e scroll de roda preserva a navegação da página.

Teste de renderização atualizado antes da troca falhou contra iframe anterior; depois, 116/116 testes aprovados, build aprovado e lint sem erros (aviso preexistente). CSS de Leaflet movido ao stylesheet global para permitir testes SSR em Node. Quatro E2E aprovados em 375/768/1440, incluindo zoom com emblema visível e footer legado do PDV. Rodada de captura em 1440 também passou e confirmou tiles carregados. Logs /tmp/brabus-marker-tests.log, /tmp/brabus-marker-build.log, /tmp/brabus-marker-lint.log, /tmp/brabus-marker-e2e.log, /tmp/brabus-marker-capture.log. Captura outputs/vitrine-identidade-brabus/g5-marcador-brabus.png; CUA confirmou controles/marcador, mas captura CUA teve timeout; artefato final obtido pelo teste de navegador e inspecionado visualmente. Gate visual continua pendente.

### Revisão G5 — mapa escuro e pino dourado

Usuário solicitou visual mais próximo da referência: mapa escuro e emblema em pino de localização. Mantidos Leaflet/OSM e coordenadas verificadas. DivIcon com cabeça circular de 76px e ponta dourada; anchor [38,94] fixa a ponta no ponto geográfico. Escurecimento aplicado exclusivamente ao tile-pane (invert/hue/brightness/saturation), sem afetar logo, controles, popup ou atribuição. Mantido provedor OSM, sem nova chave/serviço. Essa revisão visual substitui a orientação anterior de não aplicar filtro ao mapa. Teste novo falhou no marcador circular anterior. Na validação após a mudança, três E2E passaram e um falhou por ausência de tiles carregados após zoom; aumentar espera para 15s não resolveu. O diagnóstico HTTP do tile público retornou x-blocked: Access denied, com referência à política OSM. Não se declara mapa completo validado. Suite de 116 e build aprovados; lint sem erros com aviso preexistente. Logs /tmp/brabus-dark-*.log. Gate visual continua aberto; não avançar G6.

Pendência desta revisão: usuário consultado sobre chave pública CARTO para base escura nativa; nenhuma conta criada nem chave exposta. Ajustes do pino/tema ainda não commitados enquanto o provedor bloqueia a conferência visual. Debug temporário de console removido dos testes.

### Revisão G5 — OpenFreeMap sem cadastro/chave

Usuário autorizou alternativa sem cadastro e API key. Confirmado no serviço oficial https://openfreemap.org/ e guia https://openfreemap.org/quick_start/ que a instância pública dispensa conta e chave e oferece estilo Dark. Substituídos Leaflet/tiles OSM por MapLibre GL JS 6.17.0 e https://tiles.openfreemap.org/styles/dark. Dependências Leaflet removidas, CSS de filtro removido. Cores de background/ruas/rótulos ajustadas via propriedades nativas do estilo para contraste próximo à referência. Pin dourado com emblema, coordenadas e botão Google Maps preservados. Atribuições OpenFreeMap/OpenMapTiles/OSM mantidas pelo estilo; sem envio de geolocalização do visitante.

MapLibre requer worker explícito com o bundler atual: scripts/prepare-map-worker.mjs copia o worker da dependência instalada para public/map-engine antes de dev/build. Gerado não versionado e ignorado pelo ESLint, sem excluir código próprio da verificação. Não há chave, conta ou variável obrigatória. Em caso de falha de rede/WebGL, mensagem com alternativa Google Maps; ResizeObserver e mapa são removidos no cleanup. Renderização fica restrita ao componente cliente da Loja Física e o import da biblioteca é dinâmico.

116 testes aprovados e lint sem erros (um aviso anterior). Novo contrato de estilo falhou antes da troca (/tmp/brabus-openmap-red.log). Primeira rodada detectou worker não carregado, corrigido por URL local. Houve uma colisão entre seed E2E e testes de domínio no mesmo banco descartável; execução serial após conclusão dos testes resolveu sem mudança na base de trabalho. Quatro E2E passaram com dados reais do OpenFreeMap carregados após zoom em 375/768/1440; CUA confirmou data-map-loaded=true e ausência de erro na porta 3000. Logs /tmp/brabus-openmap-tests.log, /tmp/brabus-openmap-e2e-final.log e /tmp/brabus-openmap-e2e-contrast.log; build incluído no runner. Screenshot outputs/vitrine-identidade-brabus/g5-openfreemap-escuro.png, inspecionada visualmente. CUA não conseguiu salvar screenshot; captura final pelo teste automatizado. Pendência de chave CARTO encerrada; G5 continua aguardando aceite visual, sem avançar G6.


### G6 — revisão final e autorização de release (2026-11-08)

- Usuário aprovou G5 e autorizou merge e promoção para produção condicionados à revisão/testes finais.
- Revisão independente de main...066cbb2 sem bloqueador de código; Docker copia worker gerado no prebuild. Recomendação operacional: atualizar CEP e links Maps na única linha de StoreSettings produção, sem seed. Cadastro remoto consultado somente nesses campos: CEP anterior 62765-000, URLs vazias.
- Manifesto atualizado com aceites humanos; suplementos continuam editorial genérico provisório. Símbolo compacto opaco preservado e não consumido. WebP decodificados: dimensões conferidas e alpha real em horizontal/emblema/hero; total dos oito WebP ~1,04 MB.
- 116/116 testes passaram, lint sem erros com único aviso preexistente. Logs /tmp/brabus-g6-tests.log e /tmp/brabus-g6-lint.log.
- Novo E2E verifica assets carregados, teclado/menu/Escape, navegação hero→catálogo→produto, reduced-motion e ausência de overflow em 375/768/1440. Suite completa concluída: build aprovado, 38 E2E passaram, um caso de captura de baseline intencionalmente ignorado. Banco isolado brabus_brand_e2e; log /tmp/brabus-g6-e2e.log. Inclui permissões/custos, integração, dashboard vendedor, responsividade PDV e mapa carregado após zoom.

- Gate técnico G6 aprovado antes do merge: sem bloqueadores na revisão, 116 testes/38 E2E, build e lint sem erros. Única limitação visual aceita: suplementos genéricos provisórios. Release e verificação pública registrados após execução.

### Release de produção — G6 concluído

- Merge fast-forward de codex/vitrine-identidade-brabus para main, commit de aplicação `e3f28cd5b65c6f2632a24da02d9773d730e4f08d`. Testes repetidos após merge: 116/116, log /tmp/brabus-g6-merged-tests.log. Push autorizado para origin/main.
- Workflow [42497779216](https://github.com/melojrx/brabus_store/actions/runs/42497779216) concluído com sucesso em validação/imagem e deploy homelab. Digest publicado e conferido no serviço: `ghcr.io/melojrx/brabus_store@sha256:a0768c237d538af358748961e985e89bc48274eeecace60311b15908174fb44f`. Swarm UpdateStatus `completed`; health público HTTP200/status ok. Log /tmp/brabus-g6-release.log.
- Atualização restrita em produção às 16:02:19 UTC: uma linha StoreSettings, CEP 62765-000→62750-000, googleMapsUrl/googleMapsEmbed vazios→ponto aprovado. Update transacional com guarda de identidade/valores anteriores; sem seed, sem alteração de produtos, usuários, vendas ou estoque. Registro antes/depois em outputs/vitrine-identidade-brabus/g6-production-location-update.json (somente campos públicos).
- Três E2E somente leitura em https://brabustore.com.br passaram (375/768/1440): footer/Contato/Loja Física/CEP, responsividade sem overflow, pino com emblema e carregamento real do mapa após zoom. Sem login, pedido, pagamento ou mensagem em produção. Log /tmp/brabus-g6-production-smoke.log.
- CUA confirmou mapLoaded=true, pin=true, ausência de erro e CEP correto. Captura pública completa em outputs/vitrine-identidade-brabus/g5-openfreemap-escuro.png, inspecionada visualmente.
- HTTP200 para home, catálogo, Loja Física, Contato, login, health, worker e os sete WebP consumidos. Hash SHA256 dos WebP/worker públicos idêntico ao checkout da release. Auditoria em outputs/vitrine-identidade-brabus/g6-production-http.json. Uma tentativa inicial via urllib recebeu403; curl e navegador normais passaram, sem alteração de proteção.
- Sem novos secrets/env vars, sem migração de schema neste redesenho. O controlador de release executou seu fluxo padrão de migrations compatíveis. Aviso lint preexistente permanece fora do escopo. Suplementos seguem ilustração editorial genérica provisória aprovada.
- Registro de fechamento documental separado, sem mudança de runtime; marcador [skip ci] evita repetir a promoção da mesma aplicação.

### G7 — extensão do cabeçalho administrativo (2026-11-08)

- Usuário autorizou nova logo e paleta em todo cabeçalho administrativo, preservando layout/fluxos e exigindo avaliação local antes de publicar. Branch codex/admin-header-brand a partir de main d9b23c8, mesmo checkout, sem worktree. Publicação anterior G6 não autoriza publicar esta extensão.
- Baseline antes do código: 116 testes passaram, dashboard autenticada em banco isolado brabus_brand_e2e capturada em outputs/vitrine-identidade-brabus/g7-admin-antes.png. Header de 74px confirmado. Logs /tmp/brabus-admin-header-baseline-tests.log e /tmp/brabus-admin-header-baseline-e2e.log.
- Red: novo contrato de rota falhou por ausência do predicado; E2E falhou pela logo ausente em /admin, conforme comportamento anterior. Logs /tmp/brabus-admin-header-red-unit.log e /tmp/brabus-admin-header-red-e2e.log.
- Implementação: isAdminPath separa branding do header do tema do corpo; Navbar e BrandLogo usam assinatura compacta. CSS admin-brand-header aplica tokens apenas ao nav/menus e foco visível. Tema do corpo, sidebar, dados/handlers/permissões inalterados. PDV preserva tema aprovado, demais conteúdos admin mantêm #C9A84C.
- Após implementação: 117 testes passaram. Lint sem erros, somente aviso preexistente fetchDeliveries. Logs /tmp/brabus-admin-header-tests.log e /tmp/brabus-admin-header-lint.log. Build aprovado e suite E2E completa: 39 passaram, um baseline PDV intencionalmente ignorado. Execução serial após suite unitária; nenhum seed em base de trabalho/produção. Log /tmp/brabus-admin-header-e2e.log.

- E2E novo autenticado conferiu assinatura carregada e paleta do nav em dashboard/produtos/configurações/PDV, altura74px, corpo legado, links de conta/admin/logout e teclado/menu mobile sem overflow no header. Suites existentes conferiram permissões, operação PDV, sidebar, vitrine e mapa.
- Capturas finais inspecionadas: outputs/vitrine-identidade-brabus/g7-admin-depois.png (1366×900) e g7-admin-mobile.png (375×812). Prévia mantida em http://localhost:3100/admin com banco isolado; CUA renovou sessão antiga de teste e confirmou a dashboard autenticada.
- Revisão inline do diff: somente apresentação do nav, predicado de rota, variante de logo e testes/documentação; nenhum provider, fluxo de auth, query, endpoint ou schema alterado. G7 aguardando avaliação visual. Sem merge/push/deploy desta extensão.

### G7 — autorização de release

Usuário aprovou o visual local e autorizou merge/publicação com testes e verificação pós-deploy. Revisão independente de d9b23c8..59d792e sem bloqueadores: nav isolado, tema do corpo e fluxos preservados. Verificação fresca: 117 testes passaram, lint sem erros com aviso preexistente. Logs /tmp/brabus-g7-release-tests.log e /tmp/brabus-g7-release-lint.log. E2E completo/build em execução no banco isolado após a suite unitária, sem seed em produção/base de trabalho.

Verificação final pré-merge G7: build aprovado, 39 E2E passaram e uma captura de baseline PDV intencionalmente ignorada. Log /tmp/brabus-g7-release-e2e.log; banco isolado. Navegador autenticado em produção localizado para conferência pós-deploy: baseline headerHeight74px/mainTop74px/conteúdo #C9A84C. Nenhuma nova credencial criada.

### G7 — merge e publicação concluídos

- Merge fast-forward para main, candidato `6d4815ae1a6185fe57823a505c3ced3d125a25ac` (implementação59d792e). Suite repetida no resultado: 117/117 passaram, log /tmp/brabus-g7-merged-tests.log. Push autorizado para origin/main.
- Workflow [42500635560](https://github.com/melojrx/brabus_store/actions/runs/42500635560) concluiu validação/imagem/deploy com sucesso. Digest publicado e conferido no serviço: `ghcr.io/melojrx/brabus_store@sha256:f3b779a7e04770b9de6905d7ee87e62e73507973aa22fa0ba5864960c0ea8252`. Swarm `completed` após janela de monitoramento60s; health público HTTP200/status ok. Log /tmp/brabus-g7-release.log.
- Verificação visual autenticada no navegador existente do usuário em https://brabustore.com.br/admin, sem nova credencial/usuário: logo-horizontal.webp carregada, nav background rgb(0,0,0), primary #D4A346, altura74px. Antes/depois: mainTop74px e primary do conteúdo #C9A84C preservados.
- Captura pós-deploy em outputs/vitrine-identidade-brabus/g7-production-header.jpg mostra cabeçalho e contexto da dashboard. Somente leitura em produção; não houve seed, alteração de configurações, pedidos, estoque ou usuários nesta extensão. Nenhuma nova dependência, env ou migration.
- G7 aprovado visualmente e publicado. Evidência documental posterior em commit [skip ci] para não promover novamente código inalterado. Branch de trabalho local removida após merge/verificação.

### G8 — identidade das jornadas do cliente

- Usuário autorizou implementação local de conta/pedidos, acesso, carrinho e checkout, preservando fluxos e bloqueio de venda online. Branch codex/customer-brand-g8 da main ed6b9b1, checkout atual sem worktree. Sem autorização de publicação do G8.
- Baseline com novo contrato adicionado antes do código: 118 testes, 117 anteriores passaram e uma falha esperada na nova política de rotas. Log /tmp/brabus-g8-baseline-tests.log. Teste focado vermelho confirmou /account como legacy; E2E375 falhou na ausência de theme-storefront em login. Logs /tmp/brabus-g8-red-unit.log e /tmp/brabus-g8-red-e2e.log, captura anterior outputs/vitrine-identidade-brabus/g8-login-antes.png.
- Política agora inclui account/descendentes, quatro rotas exatas de acesso, cart e checkout/descendentes. Admin/PDV e fronteiras de segmento preservados. AuthBrandHeader compartilha logo oficial e legendas anteriores; títulos reais dos formulários passam a h1. Superfícies da conta usam token grafite. Placeholder de CEP da conta atualizado para62750-000, sem alteração de valores cadastrados.
- Após implementação:118/118 testes passaram; lint sem erros com único aviso preexistente fetchDeliveries. Logs /tmp/brabus-g8-tests.log e /tmp/brabus-g8-lint.log. Build/E2E completo em execução com ONLINE_SALES_ENABLED=false somente no processo e banco descartável brabus_brand_e2e; nenhum seed em base de trabalho/produção.

- Primeira rodada E2E:42 passaram, um falhou porque o teste novo esperava /account após login sem callback. Fonte lib/post-login-destination.ts e testes existentes confirmam / como destino padrão do cliente. Corrigida somente a expectativa/jornada do teste para iniciar em /account e validar callback; nenhuma regra de autenticação alterada. Reteste focado:4/4. Logs /tmp/brabus-g8-e2e.log e /tmp/brabus-g8-customer-retest.log.
- Rodada final completa reutilizou o mesmo build aprovado e servidor/banco isolados, sem novo seed:43 E2E passaram, um baseline PDV intencionalmente ignorado. Log /tmp/brabus-g8-e2e-final.log. Lint final sem erros, aviso anterior preservado (/tmp/brabus-g8-lint-final.log).
- Cobertura G8: quatro páginas de acesso, logos carregadas e títulos h1; identidade e ausência de overflow375/768/1440; redirecionamento protegido e erro de login; edição/persistência de perfil; histórico e detalhe de pedido em375/1440; cart/checkout/success/cancel exibem indisponibilidade e não expõem carrinho/formulário; APIs checkout/payment retornam503 com contagem de pedidos inalterada. Cenário habilitado de compra não foi ativado/exercitado.
- Revisão independente do diff sem bloqueadores: rotas com fronteiras corretas, compartilhamento do componente de acesso, admin/PDV e fluxos preservados. Inspeção visual de outputs/vitrine-identidade-brabus/g8-login-375.png, g8-account-1440.png e capturas de checkout. Imagens/campos das capturas são dados sintéticos do teste, não dados de produção.
- CUA abriu http://localhost:3100/account com admin de fixture; sessão local antiga foi encerrada pelo signout normal antes de autenticar novamente, resolvendo redirecionamento por cookie de fixture anterior. Logo e rodapé novos observados em acesso e conta. Prévia mantida no banco brabus_brand_e2e e ONLINE_SALES_ENABLED=false no processo, sem alteração de .env. Produção não foi modificada nesta rodada.
- G8 aguardando aprovação visual, sem merge/push/deploy.

### G8 — autorização e preparação de release

Usuário aprovou a prévia G8 e autorizou merge/publicação com testes e conferência pós-deploy de conta/acesso/bloqueio de vendas online. Código2c7a5a5, revisão independente já concluída sem bloqueadores e diff revisado novamente. Testes frescos118/118 passaram; lint sem erros com aviso anterior. Logs /tmp/brabus-g8-release-tests.log e /tmp/brabus-g8-release-lint.log. Suite E2E/build em execução com flag false no processo e banco isolado. Sem alteração de produção nesta preparação.

Verificação final pré-merge G8: build aprovado,43 E2E passaram e um baseline PDV intencionalmente ignorado. Log /tmp/brabus-g8-release-e2e.log. Inclui acesso/conta/perfil/pedidos e API503 sem criação de pedido, além de regressões admin/PDV/vitrine.
