# Produção de ativos da vitrine

Data de referência: 2026-11-07, America/Fortaleza.
Branch: `codex/vitrine-identidade-brabus`.

O usuário autorizou a produção dos ativos pelo Codex a partir das referências locais, substituindo a orientação anterior de aguardar geração no ChatGPT web. A autorização cobre preparação de imagens; não representa aceite visual das versões geradas nem aprovação separada do plano de implementação do site.

## Arquivos para consumo

Pasta: `public/brand/`. Usar WebP no site; PNG mantém a versão de origem da derivação. Os originais fornecidos pelo usuário continuam preservados em sua pasta de imagens. Metadados de dimensões, transparência e status em `docs/brand/vitrine-assets-manifest.json`.

| Ativo | WebP | Dimensões servidas | Transparência | Estado |
| --- | --- | --- | --- | --- |
| Logo horizontal | `/brand/logo-horizontal.webp` | 768 × 309 | Sim | Derivação por IA, aguardando aceite visual |
| Emblema | `/brand/emblema-principal.webp` | 960 × 960 | Sim, exterior do círculo | Derivação por IA, aguardando aceite visual |
| Símbolo compacto | `/brand/simbolo-compacto.webp` | 512 × 486 | Não, fundo preto | Original preservado; alternativas transparentes rejeitadas |
| Moda masculina | `/brand/categoria-masculina.webp` | 1448 × 1086 | Não | Composição editorial baseada nas peças fornecidas |
| Acessórios | `/brand/categoria-acessorios.webp` | 1448 × 1086 | Não | Composição dos bonés de referência; sem coqueteleira inventada |
| Suplementos | `/brand/categoria-suplementos.webp` | 1448 × 1086 | Não | Editorial genérico provisório, sem marcas/rótulos |

O total dos seis WebP é aproximadamente 625 KB. As categorias têm composição 4:3 e espaço inferior para texto HTML. As imagens não contêm título da categoria. Não usar a arte genérica de suplementos como fotografia de um SKU ou como prova de estoque/marca própria. Composições de roupas/bonés são derivadas por IA, não fotos inalteradas dos produtos.

## Fontes

- Logo horizontal: `/home/jrmelo/Imagens/brabus_store/brabus_performance_logo_embalagens_horizontal (1).png`.
- Emblema: `/home/jrmelo/Imagens/brabus_store/Emblema Brabu’s Performance Store.png`.
- Compacto: `/home/jrmelo/Imagens/brabus_store/Pulso da Caveira Brabu’s.png`; PNG copiado sem alterações, WebP otimizado.
- Roupas: `/home/jrmelo/Imagens/brabus_store/WhatsApp Image 2026-09-04 at 10.12.54.jpeg`, `/tmp/codex-clipboard-fb006ad6-7d24-4a7d-8b3c-dbac375762a5.png`, `/home/jrmelo/Imagens/brabus_store/5e3135e1-1842-4754-bd45-19638a9db334.png`.
- Bonés: `/tmp/codex-clipboard-76a99c5d-1341-4a85-8cb8-f970d79a6c3c.png`.
- Suplementos: geração nova sem referência a produto específico.

## Método e prompts das versões selecionadas

Ferramenta: `image_gen` integrada, sem CLI/API externa configurada pelo usuário. Conversão/otimização WebP com Pillow, sem novas modificações criativas após a geração. Foram rejeitadas duas extrações do compacto porque acrescentaram resíduos e textura ao traço branco. A versão selecionada do compacto é o original com fundo preto, adequado a uma superfície preta, e não é declarada transparente.

### Logo horizontal

> Use case: background-extraction. Edit target: attached official horizontal Brabu’s logo. Create a production website logo cutout on REAL transparent alpha background. Preserve the exact skull, cap, dumbbells, metallic BRABU’S lettering and PERFORMANCE STORE lettering and gold decorative bar. Remove the black textured plaque background and its large outer rounded rectangle frame only. Keep all internal black shading of the artwork. Do not redesign, invent letters, change layout or recolor. Wide horizontal aspect ratio, tightly framed with 5% transparent safety margin. Clean edges without dark halo. One logo only, no board, no extra text. Actual transparent PNG.

### Emblema

> Use case: background-extraction. Edit target: official circular Brabu’s emblem supplied. Remove only the black area OUTSIDE the outer golden circular rim, replacing it with REAL alpha transparency. Preserve the entire artwork INSIDE the circle exactly, including the black background, skull, backwards cap, dumbbells, smoke, gold rim, all lettering BRABU’S / PERFORMANCE STORE / PARA QUEM TREINA DE VERDADE. Do not redraw or alter typography. Center full circle within square image with 5% transparent safety margin, no clipping. Actual transparent PNG, no checkerboard drawn.

### Prefixo comum às três categorias

> Professional ecommerce category editorial for Brabu’s Performance Store. Landscape 4:3 composition, black #000000 and graphite #1A1A1A studio background, restrained warm gold #D4A346 rim lighting, premium realistic product photography. Keep subjects in central upper 75% with breathing room at edges, lower quarter dark clean negative space for HTML heading added later. No overlaid copy, prices, slogans, badges, borders, watermarks. This is a category illustration, not a new product SKU.

### Complemento — moda masculina

> Use case: compositing. Images 1 and 2 are garment references; image 3 supports the male clothing brand style, do not reproduce the person. Create a beautiful flat lay of actual men's Brabu’s training clothes: black and sand sleeveless athletic tops from image 1 and black drawstring shorts from image 2. Arrange with gentle overlap on matte dark surface, angled garments and visible fabric texture. Preserve garment construction and existing small white skull/BRABU’S marks faithfully, do not invent designs. Remove all promotional text about sizes and colors from source photo. No people, no female clothes, no props not provided. Garments well exposed with enough contrast against background.

### Complemento — acessórios

> Use case: compositing. Reference image shows the two actual Brabu’s mesh trucker caps, one black and one dark navy. Isolate and arrange those same two caps professionally on a charcoal studio surface, remove hand/person and cream wall entirely. Preserve shape, mesh, curved brims, existing white skull and small BRABU’S wordmark. Three-quarter product angle, black cap slightly behind navy cap, subjects clearly visible with soft shadows. No added shaker or other accessory because no product reference is available. No people. Do not redesign or add marks.

### Complemento — suplementos

> Use case: product-mockup. Create a provisional conceptual assortment of supplement packaging: two large black sports nutrition tubs of different heights, a smaller cylindrical creatine-sized container, a small vitamin bottle and a small sealed stand-up pouch. Deliberately UNBRANDED packaging with no words, no fake labels, no nutritional numbers and no brand logos. Matte black and charcoal packaging, restrained warm gold bands, realistic screw lids and material textures. Tiered arrangement across low charcoal podium, studio key light makes individual silhouettes distinct, no loose powder or scoop dominating image. No implication these are own-brand Brabu’s products. This is generic editorial category artwork, not a factual photograph of current inventory.

## Validação

Todos os 12 arquivos PNG/WebP foram decodificados. Dimensões do mapa conferidas com os WebP servidos. Canal alpha real confirmado em logo horizontal e emblema, preservado após conversão; compacto original confirmado opaco. Inspeção visual das saídas realizada: letras das assinaturas, composição masculina, bonés e ausência de rótulos na arte genérica. O aceite de marca e fidelidade das derivações permanece humano; geração não garante reprodução pixel a pixel do original.

Nenhum consumidor da aplicação foi alterado nesta preparação. Os caminhos estão prontos para o mapa `lib/brand-assets.ts` previsto no plano. Categorias/cards e PDV continuam sujeitos aos gates combinados.

## Aceites posteriores — 2026-11-08

As versões efetivamente integradas (horizontal, emblema, hero aberto/atmosfera, categorias) foram aprovadas nos gates G2–G5. Manifesto atualizado no G6. Suplementos continuam uma composição editorial genérica provisória autorizada, não fotografia de estoque nem SKU. Compacto permanece original opaco, preservado sem consumo; não houve nova extração nem aprovação fictícia de transparência.
