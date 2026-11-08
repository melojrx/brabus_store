# Redesenho da vitrine Brabu’s

Data: 2026-11-07 (America/Fortaleza).
Status: G0–G10 concluídos e publicados após os aceites. G10 publicado em2026-11-08, release f871381/workflow42530721484. G9 publicado em 2026-11-08, release3276176/workflow42526800281. Mockups editoriais da categoria preservam navegação ao catálogo real e bloqueio de vendas online.
Branch: `codex/vitrine-identidade-brabus`, criada da `main` local em `2c5cecb`.
Execução: checkout atual, sem worktree; trabalho sequencial, sem subagentes por padrão.

## Objetivo e escopo

Aplicar a identidade preta, grafite e dourada à vitrine local, começando por cabeçalho, hero, faixa de informações, categorias e cards. Incluir o PDV apenas na assinatura compartilhada e na paleta, sem redesenhar sua operação. A ampliação limitada ao PDV foi autorizada pelo usuário após o pedido inicial.

O escopo inicial de prévia local foi ampliado por aprovações sucessivas: footer, Loja Física e Contato recebem composição própria, CEP 62750-000 e mapa escuro com pino da marca. Em 2026-11-08, usuário aprovou G5 e autorizou merge e promoção para produção após revisão/testes finais. Atualizar somente CEP/links do mapa no cadastro existente de produção, sem seed nem alteração das fotos/dados dos produtos.

## Evidências e referências

- Prancha fornecida: `/home/jrmelo/Imagens/brabus_store/a_polished_brand_identity_mockup_board_for_brabu.png`.
- Assinatura horizontal existente: `/home/jrmelo/Imagens/brabus_store/brabus_performance_logo_embalagens_horizontal (1).png`.
- Emblema existente: `/home/jrmelo/Imagens/brabus_store/Emblema Brabu’s Performance Store.png`.
- Contexto: `/home/jrmelo/Brabus Vault/10-Memória-e-Decisões/Contexto-Geral-Brabus.md`; nota histórica, sem usar seus números de catálogo como dados atuais.
- Inspeção visual local: home, catálogo, produto, loja e contato. A home usa fotografias genéricas; as categorias atuais não representam a linha masculina e os acessórios. Vários produtos locais usam placeholder.
- `app/globals.css` usa `#C9A84C` e `#CC2200`; `docs/PRD.md`, seção 9, registra a identidade anterior. Os códigos novos vêm da prancha, não do PRD antigo.
- As imagens PNG de marca inspecionadas não possuem transparência real. Não declarar os arquivos atuais como logos transparentes.

## Direção visual

Preto predominante, grafite separando superfícies, dourado quente em ações e detalhes, off-white na leitura. Metal e luz ficam na arte oficial e em decoração discreta do hero. Sem fumaça animada, partículas, vídeo automático ou textura atrás de texto de produto.

| Papel | Valor | Uso |
| --- | --- | --- |
| Fundo | `#000000` | Fundo da vitrine |
| Superfície | `#1A1A1A` | Cards, faixa de informações e campos |
| Marca | `#D4A346` | Ação principal, seleção, preço, ícones |
| Texto | `#F4F4F4` | Títulos e corpo principal |
| Acento | `#E01919` | Detalhes pontuais, sem substituir estados semânticos |
| Hover proposto | `#E7BB68` | Botão dourado com texto preto |
| Texto secundário proposto | `#B8B8B8` | Descrições |
| Borda proposta | `#383838` | Separação decorativa; controles exigem contraste próprio |

Dourado com texto preto: contraste calculado de aproximadamente 9,13:1. Off-white sobre dourado: 2,09:1; não usar em botões com texto pequeno. Off-white sobre vermelho de marca: 4,42:1; não usar esse par em texto pequeno. Estados de erro, sucesso, aviso e disponibilidade mantêm cores semânticas independentes, com rótulo legível. WhatsApp mantém identificação verde.

Manter Bebas Neue e Inter já instaladas nesta fase. Resolver as fontes por suas variáveis de `next/font` dentro do tema público; não corrigir o mapeamento global de modo a mudar a tipografia do painel. Títulos de seção em Bebas; corpo, preços, navegação e nomes de produto em Inter. Não simular o desenho do logo com fonte.

## Cabeçalho

- Assinatura horizontal oficial, preservando proporção, sem a prancha inteira.
- Desktop: largura visual de aproximadamente 190–220 px, navegação existente e ações à direita.
- Celular: composição de até 155 px de largura; preferir assinatura legível; usar símbolo compacto se necessário, com nome acessível da loja.
- Fundo preto suficientemente opaco para leitura durante scroll, borda inferior discreta e foco visível.
- Ações com área mínima de 44 × 44 px; manter menu da conta, logout, entrada do vendedor e carrinho condicional.
- Preservar `onlineSalesEnabled`, sessão, papéis, URLs e comportamento de menus.
- Variante nova apenas nas rotas públicas delimitadas e no PDV; outras páginas administrativas mantêm o cabeçalho atual.

## Hero

Revisão autorizada em 2026-11-08: usar a assinatura aberta “Força de Verdade” em vez do medalhão fechado. Transparência externa, fumaça e brasas discretas e estáticas nas bordas, com controle independente de intensidade. Preservar texto e ações existentes. Detalhamento e evidências em `docs/brand/2026-11-08-hero-integrada.md`; segue o mesmo gate G2 de avaliação visual.

- Desktop: duas colunas, texto/ações à esquerda e emblema oficial à direita. Conteúdo em container consistente com o restante da home.
- Título: “Para quem treina de verdade”. Corpo proposto: “Suplementos, moda fitness masculina e acessórios para sua rotina de treino.”
- CTAs: “Ver suplementos” e “Moda masculina”, mantendo os slugs atuais `suplementos` e `roupas-fitness`.
- Celular: título e ações antes da arte; arte menor e sem empurrar os CTAs para baixo de uma seção excessivamente alta. Título adaptável com `clamp`, sem altura fixa em `85vh`.
- Luz radial suave e detalhe dourado decorativo. Sem foto genérica de academia nesta composição.
- Não reproduzir mockups de embalagens como se fossem produtos disponíveis.
- Evitar novas promessas de resultado, cobertura ou prazo; manter a regionalidade sem inventar fatos comerciais.

## Faixa de informações

Três itens em grafite, com ícone dourado, título off-white e texto secundário: atendimento/entrega regional sem prazo novo, loja física e Instagram. Usar `StoreSettings` para endereço e redes disponíveis; não criar nova fonte de contatos. Remover a promessa fixa “em até 24h” desta faixa, usando “Consulte a entrega para sua cidade”. Desktop em três colunas; celular em linhas compactas, sem três cards altos.

## Encontre seu objetivo

Preservar o título da seção e os links dinâmicos existentes. Mudar apresentação de “Roupas fitness” para “Moda masculina” apenas na vitrine; não renomear entidades no banco.

| Categoria existente | Representação correta | Não usar |
| --- | --- | --- |
| `roupas-fitness` | Camisetas/regatas e shorts masculinos; produtos reais ou modelo com peças autorizadas | Linha feminina, leggings/tops femininos |
| `acessorios` | Bonés e coqueteleiras como protagonistas, outros acessórios secundários | Pessoas fazendo alongamento como representação principal |
| `suplementos` | Composição de embalagens reais: diferentes famílias efetivamente cadastradas | Scoop/pó isolado como toda a categoria; rótulos inventados |

Imagens com fundo, 1600 × 1200 px como fonte. Tratamento consistente: preto/grafite, dourado discreto, objeto central e área inferior livre. `object-position` configurável por categoria para funcionar em três colunas e no celular. Descrição disponível por toque/leitura normal, não exclusivamente em hover. Bordas de 1 px, raio de 8 px, gradiente inferior moderado, proporção 4:3.

Não alterar os critérios atuais de seleção de categorias nem ocultar categorias adicionais no catálogo. Caso uma categoria não tenha arte específica, usar fallback neutro e identificado, sem reutilizar imagem semanticamente incorreta de outra linha.

## Cards de produto

Criar um componente de apresentação compartilhado pela home e catálogo, mantendo queries, serialização e permissões nos consumidores atuais.

- Região da foto quadrada, separada da região de informação; `object-contain` com respiro para não cortar embalagem ou peça.
- Categoria opcional, nome com até duas linhas e altura consistente, preço em Inter semibold e dourado.
- Ação da home recebida como slot; manter `AddToCartButton` e seu modo WhatsApp/carrinho. Catálogo mantém o link para detalhe, sem inventar compra direta.
- Foto e nome levam ao mesmo produto; sem links aninhados e sem overlay que intercepte a ação de WhatsApp.
- Estoque zero, estoque baixo e novidade mantêm a prioridade atual. Badges com contraste legível e texto; não comunicar estado apenas pela cor.
- Placeholder honesto “Imagem indisponível”, sem gerar embalagem de um produto específico.
- Duas colunas no celular, quatro no desktop, sem deslocamento vertical no hover. Imagens com dimensões reservadas e lazy loading abaixo da dobra.
- A unidade compartilhada não será usada na tabela ou nos cards internos do PDV.

## Arquitetura e manutenção

1. `lib/storefront-theme.ts`: seleção pura de tema por rota. Retorna `storefront` para `/`, `/products` e descendentes, `/loja`, `/contato`; `pdv` apenas para `/admin/pdv`; `legacy` para demais rotas. Query string não participa dessa decisão.
2. `components/BrandTheme.tsx`: boundary cliente com `usePathname`, recebendo `children` de servidor; aplica classe da variante e mantém o shell flex existente. Sem importar Prisma ou dados de sessão para o cliente.
3. `app/globals.css`: manter os valores globais legados. Novos tokens sob `.theme-storefront` e `.theme-pdv`. Tipografia e decoração de vitrine somente sob `.theme-storefront`; `.theme-pdv` recebe apenas as cores de marca. Regras decorativas limitadas a componentes da vitrine.
4. `lib/brand-assets.ts`: caminhos locais, dimensões e estado de prontidão dos ativos. Categorias em mapa por slug com texto e ponto focal. Troca de arquivo não exige editar o layout.
5. `components/brand/BrandLogo.tsx`: marca compartilhada, dimensões e texto alternativo consistentes.
6. `components/storefront/StorefrontHero.tsx`, `StorefrontInfoStrip.tsx`, `ObjectiveCategories.tsx`, `ProductCard.tsx`: unidades de apresentação pequenas. Queries permanecem na home/catálogo.
7. `components/Navbar.tsx`: selecionar marca nova/legada pela mesma política de rota. Evitar diferentes listas de rotas em componentes distintos.

Sem nova biblioteca de UI, dependência de animação, endpoint, migration ou upload no banco. Não aproveitar o trabalho para refatorar autenticação, catálogo ou cálculo de preço.

## PDV: extensão limitada

Somente nova marca do cabeçalho e substituição das variáveis de marca herdadas no caminho `/admin/pdv`. Não trocar tipografia, layout, densidade, tabela, sidebar, campos ou tamanhos. Não aplicar textura, hero ou cards da vitrine ao painel.

Testar foco/seleção de produto, quantidade, seleção de cliente, resumo, descontos e estados de pagamento. Manter regras de fiado, estoque, permissões e acesso a custos. Testes de conclusão de venda somente no banco descartável `_e2e`; na base local de trabalho, avaliar sem finalizar pedidos.

Verificar também dashboard e cadastro de produtos, que devem continuar com o tema legado. Não atualizar toda a administração para acomodar o PDV. Se houver dependência que exija mudar fluxos/estrutura do painel, registrar e deixar a ampliação para outra especificação.

## Ativos e integração provisória

Briefing detalhado em `docs/brand/2026-11-07-vitrine-assets.md`.

A orientação inicial era aguardar arquivos do ChatGPT web. O usuário depois autorizou a geração/preparação pelo Codex usando as referências locais. Derivações agora estão em `public/brand/`, aguardando aceite visual, conforme registro de produção. O compacto selecionado é o original opaco; extrações ruins foram rejeitadas. Suplementos usam composição editorial genérica provisória autorizada, sem rótulos ou marcas inventadas. Não usar essa composição para ilustrar um SKU nem como prova de estoque.

Gate de ativos finais: transparência real nos três PNGs de marca; fidelidade de letras e símbolo; categoria masculina; acessórios corretos; variedade de suplementos com embalagens reconhecíveis e reais. Otimizar cópias para web, preservando fontes fornecidas. SVG opcional deve ser fiel ao original e não conter scripts ou recursos externos.

## Gates e critérios de aceite

| Gate | Entrega | Verificação e liberação |
| --- | --- | --- |
| G0 | Spec, plano, baseline, branch e briefing | Revisão desta spec pelo usuário antes de código |
| G1 | Tema isolado e marca | Testes de rotas, fontes e cores; navegação público → PDV → dashboard sem vazamento; teste de menu/carrinho |
| G2 | Cabeçalho, hero e faixa | Lint/testes/build; screenshots desktop e celular; usuário avalia composição local |
| G3 | Categorias e cards compartilhados | Links, estoque, preço, WhatsApp e filtros preservados; fotos corretas ou pendências explícitas; usuário avalia |
| G4 | PDV com marca/paleta | Regressão de responsividade e fluxos em `_e2e`; sem mudança de layout e sem alteração no restante do admin |
| G5 | Ativos finais e entrega local | Assets conferidos, checks finais, screenshots e aceite visual final; sem deploy implícito |

G1 é técnico e pode prosseguir após checks; G2 e G3 são pausas de avaliação visual pelo usuário. G4 depende de G3 aprovado. Não avançar sobre rejeição ou ausência de aceite dos gates visuais. Ativos pendentes não impedem validar layout em G2, mas impedem declarar G5 concluído.

Verificar em 375 × 812, 768 × 1024 e 1440 × 900; PDV também em 1280 × 800 e 1366 × 768 com sidebar recolhida/expandida. Sem overflow horizontal da página; rolamentos internos existentes de categorias/tabela permanecem permitidos. Teclado, foco visível, alvos de 44 px, reduced-motion e texto sem cortes. Capturar screenshots em `outputs/vitrine-identidade-brabus/`, fora dos commits.

## Validação e rastreabilidade

Baseline e resultados de cada gate em `docs/superpowers/validation/2026-11-07-vitrine-identidade-brabus.md`. Rodar testes existentes antes das alterações; escrever testes de comportamento novos antes da implementação correspondente e confirmar falha esperada. Evitar testes que apenas procurem nomes de classes no código.

Comandos obrigatórios após cada fase que altere código: `npm test`, `npm run lint -- .`, `npm run build`. Verificação manual/browser antes e depois por gate visual. Testes de navegador com fixtures somente via configuração `_e2e` existente; não executar seed/migrate para preparar a base de trabalho. Não guardar credenciais ou dados de clientes nos documentos/screenshots.

Commits convencionais pequenos por fase, autor `Junior Melo <jrmeloafrf@gmail.com>`. Preservar `outputs/` preexistente. Não criar worktree nem alterar a `main`. Reversão por commits da fase; sem feature flag remota para este preview local.

## Extensão aprovada G7 — cabeçalho administrativo

Após publicação G6, usuário autorizou uniformizar logo e paleta do cabeçalho em toda `/admin` e descendentes, preservando layout/fluxos e tema do conteúdo. Usar assinatura compacta na linha existente, preto/dourado/off-white restritos ao nav e menus internos. A política de tema do corpo permanece igual; rotas não administrativas não recebem esse cabeçalho. Avaliação local antes de nova publicação, conforme plano G7.

G7 aprovado visualmente e publicado em 2026-11-08 após revisão/testes: candidato6d4815a, workflow42500635560. Verificação autenticada confirmou o cabeçalho novo e isolamento da paleta, conforme registro de validação.

## Extensão aprovada G8 — jornadas do cliente

Usuário autorizou uniformizar conta/pedidos, acesso (login, cadastro, recuperação/redefinição de senha), carrinho e checkout com a identidade da vitrine. Usar tema público, cabeçalho/rodapé oficiais e assinatura compartilhada nos formulários. Preservar layout funcional, dados, fluxos e bloqueio das vendas online. Admin/PDV mantêm o escopo G7. Planificação e critérios no G8; avaliação local obrigatória antes de nova publicação.

G8 aprovado visualmente e publicado após verificações:118 testes/43 E2E, build e lint sem erros; smoke público3/3, conta autenticada e bloqueio de APIs conferidos. Detalhes no registro de validação.

## Extensão G9 — arte da categoria Suplementos

Usuário aprovou mockups com identidade Brabu’s na composição de cinco embalagens em pedestais. Arte apenas editorial, sem criar SKU/alterar produtos; href preservado para catálogo real. Implementado, testado e publicado após aprovação; evidências no plano/validação G9 e briefing docs/brand/2026-11-08-suplementos-mockups.md.

## G10 — Favicon e aplicativo

Autorizado em2026-11-08: derivar caveira da nova hero sem textos, enquadramento compacto; favicon16/32, Apple180, PWA192/512 e maskable512 com fundo opaco e área segura. Versionar URLs/namespace do cache e preservar comportamento offline e fluxos. Prévia local obrigatória antes de publicar. Implementação na branch codex/g10-brand-icons, checkout atual; detalhes/proveniência em docs/brand/2026-11-08-brand-icons.md. Execução visual aprovada e publicação concluída em2026-11-08; release f871381/workflow42530721484, ícones/cache conferidos em produção.
