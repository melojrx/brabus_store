# Vitrine Brabu’s Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Execução no checkout atual, sem worktree. Subagentes somente quando uma tarefa independente justificar ganho de tempo; não há delegação obrigatória.

**Goal:** Entregar a nova identidade na vitrine local, com categorias corretas e extensão limitada de marca/paleta ao PDV.

**Architecture:** Boundary de tema por rota mantém tokens novos restritos à vitrine e ao PDV. Componentes pequenos de apresentação recebem os dados atuais de servidor; catálogo e home compartilham o card sem compartilhar consultas nem expor dados internos. Ativos ficam mapeados em um único módulo, com arquivos provisórios identificados.

**Tech Stack:** Next.js 16.1.7, React 19, TypeScript, Tailwind CSS 4, Lucide, `node:test`/tsx e Playwright existentes.

## Global Constraints

- Checkout atual, sem worktree; branch `codex/vitrine-identidade-brabus` da `main` local em `2c5cecb`.
- Spec e plano aprovados explicitamente pelo usuário. G2, G3, G4 e G5 aprovados visualmente. G6 autorizado em 2026-11-08, incluindo merge e promoção para produção após revisão/testes aprovados.
- Merge, push e promoção via workflow de produção autorizados no G6. Sem seed em produção/base de trabalho, sem alteração de produtos. Atualização restrita do CEP e links do mapa no cadastro de produção autorizada pelo escopo aprovado.
- Textos em português; código/commits em inglês; 2 espaços, sem ponto e vírgula, strings duplas e alias `@/`.
- Bebas Neue e Inter existentes; nenhuma nova dependência ou fonte externa.
- Preto `#000000`, grafite `#1A1A1A`, dourado `#D4A346`, off-white `#F4F4F4`, acento `#E01919` somente nos temas delimitados.
- PDV: somente paleta e assinatura; sem mudança de layout, densidade, fonte ou fluxo de venda. Demais rotas administrativas com tema legado.
- Preservar `onlineSalesEnabled`, papéis, acesso a custos, slugs, seleção dinâmica de categorias e fontes de `StoreSettings`.
- Roupas fitness representadas por linha masculina; acessórios por bonés/coqueteleiras; suplementos por variedade de embalagens reais.
- Produção de ativos pelo Codex foi autorizada posteriormente. Arquivos em `public/brand/`, com fontes, prompts e limitações em `docs/brand/2026-11-07-vitrine-assets-production.md`. Derivações aguardam aceite visual; suplementos são editoriais genéricos provisórios; compacto mantém fundo preto.
- Comandos de gate: `npm test`, `npm run lint -- .`, `npm run build`; evidências em `docs/superpowers/validation/2026-11-07-vitrine-identidade-brabus.md`.
- Screenshots em `outputs/vitrine-identidade-brabus/`, sem dados pessoais ou credenciais, fora dos commits. Preservar `outputs/` preexistente.
- Commits por fase com autor `Junior Melo <jrmeloafrf@gmail.com>`. Não usar `git add .`.

---

## G0 — Preparação e revisão

- [x] Ler regras e comparar site, código e referências.
- [x] Criar branch sem worktree.
- [x] Executar baseline: 102/102 testes, lint sem erros com um aviso preexistente, build concluído.
- [x] Escrever spec, briefing de ativos e registro de validação.
- [x] Incorporar autorização posterior para PDV limitado.
- [x] Usuário aprovar a especificação.
- [x] Usuário revisar/aprovar separadamente este plano e autorizar implementação até G2.

O briefing de produção está em `docs/brand/2026-11-07-vitrine-assets.md`. A produção foi depois autorizada e executada pelo Codex; os ativos aguardam avaliação. O G0 não depende da entrega dos PNGs; a aprovação final do visual depende.

## Task 1 / G1 — Isolar tema e mapa de ativos

Estado: implementado e verificado no commit `a8ef177`. 104 testes aprovados, lint sem erros e build aprovado. O mapa agora usa os ativos preparados em vez de copiar provisórios; PDV permanece desativado conforme plano. Evidências no registro de validação.

**Files:**
- Create: `lib/storefront-theme.ts`, `lib/brand-assets.ts`, `components/BrandTheme.tsx`.
- Modify: `app/layout.tsx`, `app/globals.css`.
- Test: `tests/storefront-theme.test.ts`.

**Interfaces:**

```ts
export type BrandTheme = "storefront" | "pdv" | "legacy"
export function getBrandTheme(pathname: string): BrandTheme

export type BrandAsset = {
  src: string
  width: number
  height: number
  provisional: boolean
}

export type ObjectiveArtwork = {
  title: string
  description: string
  image: BrandAsset | null
  objectPosition: string
}

export const brandAssets: {
  horizontal: BrandAsset
  emblem: BrandAsset
  compact: BrandAsset | null
}
export const objectiveArtwork: Record<string, ObjectiveArtwork>
```

`BrandTheme` recebe `{ children: React.ReactNode }`, usa `usePathname` e `getBrandTheme`, e produz um wrapper flex `min-h-screen`. Nesta tarefa, ativar somente `theme-storefront`; a política já classifica PDV, mas sua classe e seus tokens serão ativados apenas na Task 4, após baseline autenticado. Não condicionar mount de children ao pathname. Manter providers de sessão/carrinho e componentes servidor no lugar; wrapper não busca dados.

- [ ] Escrever e executar antes do módulo o teste de política:

```ts
import assert from "node:assert/strict"
import test from "node:test"
import { getBrandTheme } from "../lib/storefront-theme"

test("public storefront routes receive the storefront theme", () => {
  for (const path of ["/", "/products", "/products/isn-100-whey", "/loja", "/contato"]) {
    assert.equal(getBrandTheme(path), "storefront")
  }
})

test("only the PDV route receives the PDV palette", () => {
  assert.equal(getBrandTheme("/admin/pdv"), "pdv")
  for (const path of ["/admin", "/admin/products", "/admin/pdv-other", "/auth/login", "/account", "/cart", "/products-other"]) {
    assert.equal(getBrandTheme(path), "legacy")
  }
})
```

Run: `node --import tsx --test tests/storefront-theme.test.ts`. Confirmar falha por módulo ainda inexistente, depois implementar a política: igualdade para rotas fixas e `pathname.startsWith("/products/")` para detalhes. Não usar `startsWith("/admin")` para tema novo.

- [ ] Adicionar o boundary no layout, preservando a relação flex de navbar/main/footer. Aplicar tokens novos por herança somente no boundary; não mudar `@theme` global legado.
- [ ] Para fontes, sobrescrever `--font-heading: var(--font-bebas-neue)` e `--font-body: var(--font-inter)` apenas em `.theme-storefront`. Preparar tokens PDV na Task 4. Estilos decorativos `.storefront-*` não podem atingir `.theme-pdv`.
- [ ] Criar mapa dos ativos. Copiar bytes dos originais atuais para nomes provisórios em `public/brand/`; registrar dimensões reais, `provisional: true`. Não colocar a prancha inteira no hero. Imagens de categoria começam `null` se as novas ainda não chegaram; o fallback será tratado na Task 3.
- [ ] Reexecutar teste e checks de gate. Em navegador verificar cores computadas em home e dashboard; PDV antes/depois autenticado será registrado na Task 4, antes de integrar sua variante visual.
- [ ] Registrar resultados e commitar apenas arquivos desta tarefa: `feat: isolate storefront brand themes`.

**Gate G1:** política testada, resto do admin sem tokens novos e nenhum remount que esvazie estado de sessão/carrinho. Não declarar aceite do PDV sem comparação autenticada.

## Task 2 / G2 — Cabeçalho, hero e faixa

Estado: aprovado visualmente pelo usuário em 08/11/2026, incluindo a hero integrada com fumaça e brasas estáticas. 107 testes aprovados, lint sem erros e build aprovado. Sem `DATABASE_URL_E2E`, os novos contratos foram testados por renderização automatizada antes/depois e interações no navegador local; o runner Playwright não foi executado. Não avançar a Task 3 antes do aceite visual.

**Files:**
- Create: `components/brand/BrandLogo.tsx`, `components/storefront/StorefrontHero.tsx`, `components/storefront/StorefrontInfoStrip.tsx`.
- Modify: `components/Navbar.tsx`, `app/page.tsx`, `app/globals.css`.
- Test: `tests/e2e/storefront-brand.spec.ts`.

**Interfaces:**

```ts
type BrandLogoProps = { compact?: boolean }
type StorefrontInfoStripProps = {
  address: string
  instagram: string
  instagramUrl: string
}
```

`BrandLogo` consome `brandAssets`; `StorefrontHero` consome o emblema e links fixos de categoria; `StorefrontInfoStrip` recebe strings de `StoreSettings` já obtidas pela home. A navbar usa a política única da Task 1, mas nesta tarefa apresenta marca nova somente para `storefront`; `pdv` mantém a assinatura anterior até a Task 4. Preservar implementação e handlers dos menus existentes.

- [ ] Antes de alterar a home, escrever teste de navegador com contratos observáveis:

```ts
import { expect, test } from "@playwright/test"

test("home presents the brand and male fitness route", async ({ page }) => {
  await page.goto("/")
  const header = page.getByRole("navigation")
  await expect(header.getByRole("img", { name: "Brabu’s Performance Store", exact: true })).toBeVisible()
  await expect(page.getByRole("heading", { level: 1, name: /Para quem treina de verdade/i })).toBeVisible()
  await expect(page.getByRole("link", { name: "Moda masculina", exact: true }).first()).toHaveAttribute("href", "/products?category=roupas-fitness")
})
```

Run: `npm run test:e2e -- tests/e2e/storefront-brand.spec.ts` somente com `DATABASE_URL_E2E` configurada. Confirmar falha da ausência da imagem/nova chamada. Se a base isolada não existir, registrar bloqueio e executar a inspeção manual read-only local; não declarar E2E aprovado.

- [ ] Implementar marca no cabeçalho, ações de 44 px, fundo preto opaco e borda discreta. Proteger legibilidade mobile. Quando o símbolo compacto ainda não existir, usar assinatura horizontal, sem gerar novo símbolo.
- [ ] Extrair o hero, mantendo query e obtenção dos settings na home. Trocar foto de academia por emblema original. Layout duas colunas em desktop e texto/ações primeiro no celular; remover altura mínima de 85vh e indicador animado antigo.
- [ ] Usar os textos exatos da spec, sem acrescentar promessa de prazo ou benefício. CTAs preservam slugs existentes.
- [ ] Extrair faixa com ícones Lucide, fundo grafite e informações dinâmicas. Remover o prazo estático de 24h e usar “Consulte a entrega para sua cidade”.
- [ ] Verificar menu móvel, escape, conta e WhatsApp sem enviar mensagem; carrinho só quando o modo de vendas autorizar. Testar reduced-motion, foco e 375/768/1440 px.
- [ ] Rodar checks de gate, registrar screenshots e commitar: `feat: refresh storefront brand presentation`.

**Gate G2 — parar para avaliação:** mostrar screenshots e página local. Informar se logos ainda são os originais com fundo incorporado. Usuário avalia cabeçalho, escala do emblema, hero e faixa antes da próxima fase. Não apresentar arte provisória como final.

## Task 3 / G3 — Categorias corretas e cards compartilhados

Estado: implementação autorizada após aprovação do G2 e concluída para avaliação local em 08/11/2026. Categorias usam os três ativos preparados; home e catálogo compartilham ProductCard. 112 testes aprovados, lint sem erros (um aviso preexistente) e build aprovado. Verificação de UI local em 375/768/1440 px; testes de renderização substituem E2E nesta fase, pois DATABASE_URL_E2E permanece indisponível. G3 aprovado visualmente pelo usuário; G4 autorizado.

**Files:**
- Create: `components/storefront/ObjectiveCategories.tsx`, `components/storefront/ProductCard.tsx`.
- Modify: `app/page.tsx`, `app/products/page.tsx`, `lib/brand-assets.ts`, `app/globals.css`.
- Test: `tests/e2e/storefront-brand.spec.ts` (ampliar).

**Interfaces:**

```ts
type ObjectiveCategory = {
  id: string
  title: string
  href: string
  image: string
  description: string
}

type ProductCardProps = {
  product: {
    slug: string
    name: string
    price: number
    stock: number
    images: string[]
    category?: { name: string }
    isNew?: boolean
  }
  action?: React.ReactNode
}
```

`ObjectiveCategories` recebe `{ categories: ObjectiveCategory[] }` da seleção atual e usa o mapa por slug para os três grupos conhecidos, sem alterar queries. Remover as fotografias antigas do conteúdo curado da home depois de substituir o consumidor; não deixar URLs sem uso. Categorias desconhecidas recebem superfície neutra e seu próprio nome, sem foto de outra categoria.

`ProductCard` recebe somente campos públicos, sem custos. A home fornece `action={<AddToCartButton ... />}` com os props atuais; o catálogo não fornece ação. Não converter toda a home para componente cliente.

- [ ] Escrever E2E antes da apresentação nova. Com fixtures, validar título “Moda masculina” na seção “Encontre seu objetivo”, URL antiga correta, texto de descrição visível sem hover e acesso ao produto pelo nome. Validar imagem do produto com CSS computado `object-fit: contain`; usar teste de layout para verificar que a caixa do nome fica abaixo da imagem, não sobre ela.
- [ ] Em viewport 375 px, verificar ausência de overflow na página:

```ts
await page.setViewportSize({ width: 375, height: 812 })
await page.goto("/")
await expect.poll(() => page.evaluate(() =>
  document.documentElement.scrollWidth - document.documentElement.clientWidth
)).toBe(0)
```

- [ ] Confirmar que teste de nova categoria/layout falha na implementação anterior; manter a verificação de overflow como regressão mesmo se já passar.
- [ ] Implementar cards de categoria 4:3, ponto focal por ativo, título e descrição sempre legíveis. Usar imagens novas caso entregues; caso contrário usar fundo neutro com ícone contextual e informar explicitamente essa pendência no gate, sem manter fotos femininas ou scoop isolado.
- [ ] Implementar card de produto com mídia quadrada `object-contain`, nome de até duas linhas e preço separado. Usar alt descritivo, dimensões reservadas, imagem abaixo da dobra lazy. Ausência de foto mostra “Imagem indisponível”, sem foto sintética de embalagem.
- [ ] Migrar loops home/catálogo para o componente. Preservar estados de estoque e prioridade de badge; imagens/nome como links e ação fora dos links. Não alterar `AddToCartButton` ou regras de variantes.
- [ ] Verificar catálogo com busca, filtros, paginação e vazio; abrir produto e conferir nome, preço, estoque e URL WhatsApp. Não finalizar compra na base local.
- [ ] Executar `npm test`, lint, build e E2E quando disponível; registrar screenshots e commitar: `feat: align categories and product cards`.

**Gate G3 — parar para avaliação:** usuário avalia categorias e cards. Separar aprovação de composição da aprovação das imagens finais. Não avançar ao PDV sem aceite desta fase.

## Task 4 / G4 — PDV com extensão visual limitada

Estado: implementação verificada e aprovada visualmente pelo usuário em 08/11/2026. Banco local separado `brabus_brand_e2e` criado para fixtures e testes. Baseline autenticado anterior à mudança capturado em 1280×800 e 1366×768, nos dois estados de sidebar. 112 testes e 14 testes de navegador aprovados; build e lint sem erros. Prévia autenticada na porta 3100, base sintética. G5 não iniciado.

**Files:**
- Modify: `app/globals.css`, `components/Navbar.tsx`, `components/BrandTheme.tsx`, `components/brand/BrandLogo.tsx`. Política exata existente em `lib/storefront-theme.ts` preservada.
- Test: `tests/e2e/admin-responsiveness.spec.ts`, `tests/e2e/pdv-brand.spec.ts`, `tests/e2e/seller-dashboard-access.spec.ts`, caso de PDV em `tests/e2e/product-cost-access.spec.ts` e suites unitárias existentes.
- Não modificar: lógica em `lib/pdv*`, fluxo em `app/admin/pdv/PdvManager.tsx`, schema ou endpoints.

**Interfaces:** mesmas `getBrandTheme` e `BrandLogo` das Tasks 1/2; sem novos props de domínio.

- [x] Antes da alteração visual efetiva no PDV, capturar baseline autenticado em base de teste com 1280 × 800 e 1366 × 768, sidebar recolhida/expandida. A Task 1 não ativa `.theme-pdv`; esta tarefa registra o baseline antes de ativar classe/tokens e assinatura. Não inventar um baseline posterior.
- [x] Adicionar teste E2E com login de fixture via helper existente. Conferir que cabeçalho do PDV tem assinatura nova, `--color-primary` é `#D4A346` e em `/admin` continua `#C9A84C` após navegação. Confirmar a falha esperada antes de ativar o tema PDV.
- [x] Ativar variante PDV apenas no caminho exato. Limitar diferenças a cores de marca herdadas e assinatura. Manter fonte, dimensões, sidebar e tabela. Não trocar cores semânticas de pagamento/erro pelo vermelho da marca.
- [ ] Rodar `npm run test:e2e -- tests/e2e/admin-responsiveness.spec.ts tests/e2e/seller-dashboard-access.spec.ts tests/e2e/storefront-brand.spec.ts` na base `_e2e`.
- [ ] Rodar `npm test`, lint e build. Conferir no PDV produto, quantidade, cliente, desconto, resumo, fiado e botões de pagamento; operações que gravam apenas na base `_e2e`.
- [ ] Comparar screenshots e inspecionar dashboard/cadastro para confirmar tema legado. Se exigir mudar estrutura ou lógica, retirar essa ampliação da fase e registrar a dependência para decisão do usuário.
- [ ] Registrar e commitar: `style: align PDV brand colors and header`.

**Gate G4:** responsividade e fluxos preservados, comparação autenticada disponível e nenhuma alteração fora do limite de marca/paleta. Não declarar testes transacionais executados se foram somente inspecionados visualmente.

## Task 5 / G5 — Footer, Loja Física e Contato

Estado: implementação autorizada após aceite do PDV/G4. Footer público, Loja Física e Contato implementados; CEP corrigido no cadastro local e fallback/seed. Verificações: 116 testes, build e lint sem erros (aviso preexistente), seis testes de navegador aprovados. A busca por endereço aproximava outra rua. Após reconfirmação do endereço pelo usuário, localizado o cadastro Google “Brabus Conveniência”, Av. Antônio Lopes da Silva, 571, CEP 62750-000, e configurada a incorporação oficial desse ponto. Correspondência do ponto aguarda conferência visual no gate. G6 não iniciado.

**Files:** `components/Footer.tsx`, `components/FooterTheme.tsx`, `components/LegacyFooter.tsx`, `components/storefront/StorefrontFooter.tsx`, `components/storefront/StoreLocation.tsx`, `components/storefront/StoreContact.tsx`, `app/loja/page.tsx`, `app/contato/page.tsx`, `lib/store-settings.ts`, `lib/store-location.ts`, `prisma/seed.ts`, `app/globals.css`, testes de apresentação e E2E pertinentes.

- [x] Revisar identidade dos três componentes com tokens e logo existentes, mantendo legibilidade, responsividade, foco e informações comerciais configuradas.
- [x] Corrigir o CEP da loja para **62750-000** em footer e páginas públicas; identificar a fonte compartilhada e valores antigos hardcoded para evitar divergências. Se o valor estiver persistido, tratar a atualização comercial explicitamente sem seed/migration da base de trabalho.
- [x] Loja Física: retirar a fotografia atual de academia/fachada; não gerar uma foto fictícia da loja. Compor bloco de endereço à esquerda e mapa integrado à direita no desktop, empilhados no celular, conforme referência enviada em 08/11. Manter botão “Abrir no Google Maps”, endereço e contatos reais, iframe com título acessível e carregamento lazy. Usar localização configurada, sem inventar coordenadas ou marcador personalizado. Não aplicar filtro visual que prejudique rótulos do mapa.
- [x] Contato: alinhar cartões, ícones e ações à marca, preservando canais reais e sem envio de mensagens nos testes.
- [x] Escrever testes antes da implementação para CEP, ausência da foto fictícia, mapa/URL e contatos configurados. Conferir 375/768/1440 px, ausência de overflow, teclado e links.
- [x] Executar testes, lint e build; registrar screenshots e apresentar no site local.

**Gate G5 — parar para avaliação:** usuário aprova footer, Loja Física e Contato, incluindo endereço/mapa e CEP. Não concluir a entrega final antes deste aceite.

## Task 6 / G6 — Revisão final e promoção autorizada

**Files:**
- Add: arquivos aprovados em `public/brand/`.
- Modify: `lib/brand-assets.ts`, registro de validação e plano (status dos gates).

- [x] Receber arquivos conforme briefing, abrir e conferir fidelidade, dimensões, alpha e recorte. PNG com canal RGBA não prova alpha real: verificar que há pixels com alpha menor que 255 e inspecionar halos sobre claro/escuro.
- [x] Conferir roupas masculinas, bonés/coqueteleiras e variedade real de suplementos; não aprovar rótulos gerados incorretamente.
- [x] Otimizar cópias com ferramentas já disponíveis, preservando os originais, e atualizar apenas o mapa de ativos; marcar `provisional: false` somente para arquivos aprovados.
- [x] Verificar imagens carregadas sem erro, desktop/celular, reduced-motion e teclado. Checar links sem enviar mensagens.
- [x] Rodar checks finais e E2E aplicáveis. Registrar o único aviso preexistente separadamente; não exigir sua correção neste escopo.
- [x] Revisar diff final, confirmar ausência de secrets/arquivos de `outputs/` e commitar: `style: finalize approved storefront assets`.
- [x] Entregar evidências finais, integrar à `main` e promover pelo workflow existente após revisão/testes aprovados, conforme autorização de 2026-11-08. Confirmar digest do serviço, health público, ativos, worker do mapa e CEP. Não executar seed em produção.

## Rastreabilidade de requisitos

| Requisito | Task |
| --- | --- |
| Branch da main sem worktree, baseline e gates | G0, todas |
| Nova paleta com isolamento e manutenção | 1 |
| Cabeçalho, hero e faixa | 2 |
| Moda masculina, acessórios e suplementos corretos | 3, 6 |
| Cards compartilhados e fluxos comerciais preservados | 3 |
| PDV sem ampliar layout/operação | 4 |
| Footer, Loja Física, Contato e CEP 62750-000 | 5 |
| Briefing de transparência/vetores | G0, 6 |
| Verificação antes/depois e avaliação local | Todas |

## Revisão do plano

Contratos de props e responsabilidade por consultas definidos. Gate de PDV impede ativar cores antes de seu baseline. Arquivos novos de apresentação não recebem custos. Ativos finais e `_e2e` são dependências explícitas; ausência não deve ser registrada como teste/aceite concluído. Rever esta proposta se o usuário alterar fontes, escopo de PDV ou estrutura visual nos gates.

### Ajuste aprovado do G5 — mapa com identidade

Após solicitação do marcador com emblema, usuário escolheu OpenStreetMap interativo em vez do iframe Google. Implementado StoreMap com Leaflet, marcador oficial e coordenadas verificadas no JSON de localização; link Google Maps preservado. 116 testes e quatro E2E aprovados, build aprovado, lint com aviso preexistente. Sem avanço ao G6; aguardar avaliação do marcador e das páginas.

Revisão visual adicional do G5 solicitada pelo usuário: escurecer apenas as imagens raster do mapa e desenhar um pino dourado com emblema. Coordenadas e interação mantidas; avaliar contraste e ponta do marcador no site local antes de G6.

Alternativa sem cadastro/chave autorizada e integrada no G5: OpenFreeMap Dark + MapLibre, pino dourado com emblema e botão Google Maps. Worker servido localmente e preparado automaticamente em predev/prebuild. Leaflet e filtro raster removidos; ruas e rótulos usam cores nativas de contraste maior. Chave CARTO não é mais dependência. Verificação real de carregamento após zoom nas três resoluções; aguardar aceite visual antes de G6.

### Aceite G5 e abertura G6 — 2026-11-08

Usuário aprovou explicitamente mapa escuro/pino, footer, Loja Física e Contato e autorizou merge e promoção para produção se a revisão final e os testes passarem. Essa decisão substitui a restrição anterior de entrega apenas local. A ilustração de suplementos continua genérica/provisória; aprovação visual não a transforma em fotografia de estoque. Compacto preservado opaco, sem consumidor no site.

G6: revisão independente sem bloqueadores; 116 testes e 38 E2E aprovados (baseline ignorado), lint sem erros/aviso preexistente e build aprovado. Ativos consumidos aprovados, incluindo editorial provisório de suplementos. Merge/promoção autorizados; confirmação remota na validação.

### Fechamento G6 — 2026-11-08

Merge/push concluídos em main (`e3f28cd`). Release homelab [42497779216](https://github.com/melojrx/brabus_store/actions/runs/42497779216) aprovada, digest confirmado e Swarm completed. CEP/links de produção atualizados de forma restrita, sem seed. Smoke público: três E2E passaram e assets/worker HTTP200 com hashes conferidos. G0–G6 concluídos; detalhes e limitações no registro de validação.

## G7 — Cabeçalho de toda a área administrativa (2026-11-08)

Extensão explicitamente aprovada pelo usuário após G6: aplicar logo/paleta somente ao cabeçalho em `/admin` e descendentes. As restrições anteriores sobre manter toda a área administrativa legada passam a permitir essa exceção no cabeçalho. Prévia local aprovada; merge/push/publicação agora autorizados, conforme aceite registrado ao final.

**Design aprovado:** assinatura horizontal compacta (128×40, linha de navegação de 74px), fundo preto #000000, dourado #D4A346 e texto #F4F4F4. Tokens CSS no próprio nav, sem herança para conteúdo/sidebar/footer. Menus desktop/mobile e conta recebem esses tokens dentro do nav. Preservar medidas, fontes, links, autenticação, logout, carrinho condicional e fluxos. PDV mantém seu tema anterior aprovado; demais conteúdos admin continuam legados. Não alterar login/account/cart nem tema da vitrine.

**Arquivos:** `lib/storefront-theme.ts` (predicado exato de rota administrativa, independente do tema do corpo), `components/Navbar.tsx`, `components/brand/BrandLogo.tsx`, `app/globals.css`; testes `tests/storefront-theme.test.ts`, `tests/e2e/admin-header.spec.ts` e expectativas de cabeçalho em `tests/e2e/pdv-brand.spec.ts`.

- [x] G7.1: baseline de testes e screenshot autenticada da dashboard em banco `_e2e` isolado, antes do código; branch da main no checkout atual, sem worktree.
- [x] G7.2: teste novo falha no estado anterior (rotas admin exatas/descendentes, logo/cores do header, corpo legado). Implementar somente escopo autorizado; preservar `/administrator` e `/admin-other` como não administrativos.
- [x] G7.3: teste completo, lint, build e E2E de dashboard, menu da conta, teclado/mobile, PDV/permissões. Conferir logo carregada, header 74px e conteúdo com paleta anterior. Inspecionar screenshot final.
- [x] G7.4: registrar resultados e entregar prévia local autenticada + screenshot. Aguardar aceite visual; nenhuma publicação nesta rodada.

G7 tecnicamente verificado: 117 testes/39 E2E (baseline PDV ignorado), build aprovado, lint sem erros/aviso anterior. Prévia autenticada em http://localhost:3100/admin, banco de teste isolado. Aguardando aceite visual; sem push, merge ou publicação.

### Aceite e autorização de produção G7

Usuário aprovou explicitamente o novo cabeçalho administrativo e autorizou merge em main e publicação, condicionados aos testes e conferência após deploy. Revisão independente de d9b23c8..59d792e sem bloqueadores. Release segue o workflow existente; nenhuma alteração de banco nesta extensão.

### Fechamento G7 — produção

Visual aprovado pelo usuário, merge/push autorizados e concluídos. 117 testes e 39 E2E aprovados (baseline ignorado), build aprovado, lint sem erros/aviso anterior. Release `6d4815a`, workflow [42500635560](https://github.com/melojrx/brabus_store/actions/runs/42500635560) aprovado, digest em execução confirmado e Swarm completed. Conferência autenticada em produção confirmou assinatura nova, nav preto/dourado, altura74px e conteúdo legado preservado. Sem alteração de banco nesta extensão. G7 concluído.

## G8 — Identidade das páginas do cliente

Autorizado pelo usuário após levantamento de inconsistências: conta, pedidos, login/cadastro/recuperação de senha, carrinho e checkout recebem a nova identidade. Esta extensão substitui a exclusão anterior dessas rotas. Prévia local aprovada; merge/push/publicação autorizados e concluídos no fechamento abaixo.

**Goal:** uniformizar marca, paleta, fontes, cabeçalho e rodapé das jornadas do cliente, preservando os fluxos e o bloqueio das vendas online.

**Architecture:** ampliar somente o mapa explícito de rotas em `lib/storefront-theme.ts`, sem alterar o tema administrativo/PDV. Usar `AuthBrandHeader` compartilhado pelas quatro páginas de acesso, com `BrandLogo` e legendas atuais; título de cada formulário passa a ser h1. Usar superfícies por token nas páginas da conta, sem alterar organização ou regras de formulário/pedido. Navbar/FooterTheme existentes passam a consumir o mesmo tema por rota.

**Tech Stack:** Next.js16/React19, CSS/Tailwind existentes, Playwright e Node test runner; nenhuma dependência nova.

**Files:** `lib/storefront-theme.ts`; adicionar `components/brand/AuthBrandHeader.tsx`; páginas `app/auth/{login,register,forgot-password,reset-password}/page.tsx`; classes de superfície em `app/account/page.tsx`, `app/account/AccountProfileClient.tsx`, `app/account/orders/{page.tsx,[id]/page.tsx}`. Testes em `tests/storefront-theme.test.ts`, `tests/e2e/customer-brand.spec.ts`.

**Restrições:** rotas exatas de acesso (não habilitar todo `/auth/*` desconhecido), fronteiras de segmento para `/account` e `/checkout`, carrinho exato. `/administrator`, `/account-other`, `/checkout-other` e rotas desconhecidas não recebem tema. Preservar proxy, Providers, callbacks, handlers/API, autenticação, perfil/senha/pedidos, carrinho persistido, pagamentos e estados semânticos. Não mudar env/flag ONLINE_SALES_ENABLED, nem banco de trabalho/produção. Validar compras desabilitadas com env=false no processo E2E e API503 sem pedido criado. Não enviar WhatsApp/e-mail nem executar pagamento externo.

- [x] G8.1: baseline de testes; novo teste falhando em rota/identidade antes do código, captura local anterior. Branch de main no checkout atual, sem worktree.
- [x] G8.2: ampliar política explícita de tema; compartilhar assinatura de acesso e tokens das superfícies da conta. Preservar lógica e layout funcional.
- [x] G8.3: testes completos, lint/build e E2E em banco isolado. Verificar desktop768/1440 e celular375, imagens, rodapé/logo, sem overflow, login/conta/perfil/pedidos, erros de acesso, estados de bloqueio de cart/checkout e API503. Testes não reativam venda online.
- [x] G8.4: inspeção das capturas, atualizar validação e apresentar prévia local autenticada/entrada/bloqueio. Aguardar aceite visual antes de publicar.

G8 tecnicamente verificado e aguardando aceite visual:118 testes,43 E2E aprovados (baseline PDV ignorado), build aprovado, lint sem erros/aviso anterior. Revisão independente sem bloqueadores. Prévia http://localhost:3100/account autenticada em banco isolado; acesso e bloqueio de checkout na mesma porta. Sem merge/push/publicação.

### Aceite e autorização de produção G8

Usuário aprovou o G8 e autorizou merge em main e publicação após testes, com conferência de conta, acesso e bloqueio de vendas online em produção. A restrição de entrega apenas local fica superada por este aceite. Código aprovado2c7a5a5; revisão independente prévia sem bloqueadores. Nenhuma alteração de dados/env/schema nesta promoção.

### Fechamento G8 — produção

G8 aprovado visualmente pelo usuário e publicado. Candidato893eeb2, workflow [42502717474](https://github.com/melojrx/brabus_store/actions/runs/42502717474) aprovado; digest em execução confirmado e Swarm completed.118 testes/43 E2E locais, build/lint sem erros (aviso anterior), três E2E públicos aprovados. Conta autenticada/identidade e acesso conferidos; cart/checkout e APIs de compra permanecem bloqueados. Sem alteração de dados/env em produção. Evidências no registro de validação.
