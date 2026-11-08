# Ativos para a nova vitrine Brabu’s

Data: 2026-11-07. Briefing inicial de produção. Atualização: o usuário autorizou o Codex a gerar/preparar os ativos; ver `2026-11-07-vitrine-assets-production.md` e `vitrine-assets-manifest.json` para os arquivos efetivamente produzidos, limitações e prompts. O símbolo compacto selecionado mantém o fundo preto original.

## Entregas

| Nome proposto em `public/brand/` | Fonte recomendada | Transparência | Aplicação |
| --- | --- | --- | --- |
| `logo-horizontal.png` | PNG, 2000 px de largura, proporção original | Sim, canal alpha real | Cabeçalho desktop |
| `emblema-principal.png` | PNG, cerca de 1600 × 1600, sem distorcer proporção | Sim, canal alpha real | Hero |
| `simbolo-compacto.png` | PNG, 512 × 512 | Sim, canal alpha real | Alternativa compacta para celular |
| `categoria-masculina.webp` | Fonte PNG/JPEG, 1600 × 1200 | Não | Camisetas/regatas e shorts masculinos |
| `categoria-acessorios.webp` | Fonte PNG/JPEG, 1600 × 1200 | Não | Bonés e coqueteleiras |
| `categoria-suplementos.webp` | Fonte PNG/JPEG, 1600 × 1200 | Não | Diferentes famílias reais do catálogo |

Manter as fontes na pasta de imagens fornecida pelo usuário. Apenas cópias otimizadas vão para `public/brand/`. PNG de marca pode ser distribuído como WebP com alpha após verificar qualidade. Dimensões de fonte não obrigam baixar o arquivo completo no celular; servir tamanhos responsivos.

## Pedido para remover o fundo dos logos

Enviar a imagem isolada correspondente como referência. Não solicitar ao gerador que redesenhe a marca a partir de descrição.

> Preserve exatamente o desenho, as letras, a caveira, os halteres, a proporção e as cores da marca desta referência. Remova apenas o fundo externo, sem apagar pretos que fazem parte do desenho, sem redesenhar e sem acrescentar elementos. Entregue um PNG com transparência real no canal alpha, bordas limpas e sem halo. Não desenhe fundo quadriculado. Não inclua prancha, legendas, embalagem, moldura externa de apresentação ou mockup. Preserve margem transparente de segurança ao redor da marca.

Para a versão compacta, usar o símbolo oficial já existente, sem inventar uma nova caveira. Se não for possível separar fielmente, entregar apenas as duas versões completas primeiro; a assinatura horizontal pode atender o celular com tamanho validado.

## Pedido comum às imagens de categoria

> Crie uma imagem editorial para categoria de uma loja fitness chamada Brabu’s. Formato horizontal 4:3, 1600 × 1200. Fundo preto e grafite, iluminação de estúdio com reflexos dourados discretos, fotografia realista. Use os itens de referência fornecidos, mantendo forma, cor, marca e rótulo. Composição central, segura para diferentes recortes, com espaço escuro livre no quarto inferior para receber um título no site. Sem palavras, preço, slogan, selos, chamadas, marca d’água ou logo sobreposto. Sem promessas de saúde ou resultado.

Complementos por categoria:

- **Moda masculina:** peças masculinas reais vendidas pela loja: camisetas ou regatas e shorts; flat lay ou composição em cabides funciona sem criar uma pessoa. Se houver modelo, usar roupa masculina de referência; não incluir linha feminina. A categoria continua ligada ao slug `roupas-fitness`.
- **Acessórios:** boné como protagonista, coqueteleira ao lado e apenas outros itens realmente vendidos como apoio. Não usar acessórios de academia aleatórios como se fizessem parte do estoque.
- **Suplementos:** composição de potes/embalagens reais enviados como referência; representar variedade existente, por exemplo whey, creatina, pré-treino e vitaminas quando confirmados. Não usar somente scoop e pó; não inventar marcas, rótulos ou números nutricionais.

Se o gerador não preservar rótulos, preferir uma foto real bem composta dos itens. A imagem de categoria é editorial, não substitui as fotos de cadastro de cada produto.

## Vetores

SVG não é obrigatório. É útil uma versão oficial horizontal simplificada e uma do símbolo compacto, com letras convertidas em curvas. Não vetorizar automaticamente efeitos metálicos detalhados esperando fidelidade perfeita. Não gerar logotipo novo. Arquivo sem scripts, links externos, fontes externas ou imagem de referência apenas embutida sob extensão SVG.

## Conferência na entrega

- Abrir logos sobre fundo claro e grafite: verificar alpha real, halo e letras.
- Verificar que o símbolo não foi deformado, redesenhado ou cortado.
- Conferir categoria masculina e protagonistas boné/coqueteleira.
- Conferir embalagens de suplementos com as fotos reais fornecidas.
- Conferir recorte em desktop e celular e legibilidade do título sobreposto.
- Registrar fonte, dimensões, aprovação e caminho final no mapa de ativos; sem declarar arquivos provisórios como finais.

Não precisamos de fundo transparente nas três imagens de categoria, nem gerar setas, botões, molduras ou ícones do site: esses elementos serão feitos em CSS e com Lucide, já presente no projeto.
