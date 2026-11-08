# Hero com assinatura integrada

Data: 2026-11-08. Revisão do G2 autorizada pelo usuário; demais fases permanecem aguardando avaliação.

## Composição

Substituir a arte do medalhão fechado na hero pela versão “Força de Verdade”, preservando cabeçalho, textos, faixa de informações e destinos dos dois botões. Fumaça e brasas são discretas, estáticas e decorativas. O arco dourado aberto da referência é preservado; não se trata de eliminar todo contorno da marca.

O título e as ações continuam em HTML, à esquerda no desktop e antes da arte no celular. A decoração não recebe eventos e fica fora da árvore de acessibilidade. Máscara protege a área de texto: horizontal no desktop e vertical no celular. A intensidade é controlada em CSS, separada da arte de marca. Nenhum vídeo, canvas, JavaScript de partículas ou animação foi introduzido.

## Ativos

- Fonte preservada: `/home/jrmelo/Imagens/brabus_store/Brabu’s Performance Store_ Força de Verdade.png`.
- `public/brand/hero-integrada.png`: derivação com transparência externa real. `hero-integrada.webp`: cópia otimizada, 1100 × 968, aproximadamente 377 KB.
- `public/brand/hero-atmosfera.png`: textura decorativa nova. `hero-atmosfera.webp`: 1536 × 1024, aproximadamente 13 KB.
- Originais do medalhão anterior mantidos para comparação. Caminhos e dimensões adicionados ao manifesto; seleção da hero centralizada em `lib/brand-assets.ts`.
- Derivação por IA sujeita ao aceite visual; não afirmar identidade pixel a pixel com o original. Alpha real conferido antes da otimização; PNG e WebP decodificados.

## Produção e prompts

Ferramenta integrada `image_gen`, sem CLI/API externa. Conversão WebP com Pillow, mantendo transparência e originais gerados. Não usar a textura como foto de produto ou promessa comercial.

**Assinatura:**

> Use case: background-extraction. Edit the supplied official Brabu’s Performance Store logo. Remove ONLY the external dark textured rectangular background, leaving real alpha transparency around the artwork. Preserve the existing skull, backward cap, dumbbells, silver BRABU’S lettering, PERFORMANCE STORE, PARA QUEM TREINA DE VERDADE, gold open arch and lower gold chevron exactly. Keep the existing smoke wisps around the skull with soft translucent edges. No enclosing circular medallion, no outer frame, no new lettering or invented details. Preserve the original proportions and brand identity; do not redraw or reinterpret. Full artwork entirely inside canvas with small transparent margin. Transparent PNG, no checkerboard drawn.

**Atmosfera:**

> Create a very restrained static photographic atmosphere texture for a black premium sports storefront hero. Wide horizontal composition about 3:2. Solid pure black empty background across the left 65% and the center. Only at the extreme right border and bottom-right corner: delicate low-contrast charcoal-gray smoke wisps and a few tiny warm amber ember sparks, not flames. Smoke remains dark, wispy and subtle, no white cloud. The center-left must be pure empty black for readable webpage text and buttons. No logos, no text, no objects, no people, no frames. Fine realistic smoke and sparse softly glowing embers, elegant restrained texture, not a fiery poster. The image will sit behind an independent logo and HTML text.

## Verificação

- Teste do hero atualizado antes da implementação: um teste falhou porque a renderização ainda usava `emblema-principal`; os outros dois passaram. Após troca: três testes do componente aprovados.
- Suite completa: 107/107. Lint: zero erros, aviso preexistente em `DeliveriesManager.tsx`. Build: exit code 0. `git diff --check`: sem problemas.
- O processo `next dev` anterior manteve CSS antigo apesar da atualização de JSX. Evidência: decoração com `position: static`/`opacity: 1` e chunk dev sem o seletor novo, enquanto o build de produção tinha o seletor correto. Reiniciado o mesmo servidor local, sem alterar banco/configuração; estilos computados novos confirmados (`absolute`, opacidade `.4` no celular e `.6` em tela larga).
- Navegador em 375 × 812 e 1440 × 900: sem overflow, arte carregada, decoração oculta da acessibilidade e sem animação, botões com no mínimo 52 px e mesmas URLs. Emulação temporária de métricas usada para neutralizar o zoom existente durante a captura; restaurada ao finalizar, sem alterar o zoom do usuário.
- Capturas em `outputs/vitrine-identidade-brabus/g2-hero-integrada-mobile.jpg` e `g2-hero-integrada-desktop.jpg`. Comparação anterior em `g2-mobile.jpg` e `g2-desktop.jpg`.
- Sem banco `_e2e`: suite transacional/autenticada não executada. Revisão visual do usuário ainda pendente; não avançar para G3/G4.
