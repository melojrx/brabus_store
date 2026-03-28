# PWA da Brabu's Store

## Objetivo

Implementar a base do PWA prevista em `TASK-S2-APP-01`, deixando a loja:

- instalável em navegadores compatíveis;
- com ícones próprios da marca;
- com metadados de instalação consistentes;
- com fallback offline mínimo para falha de navegação.

## Escopo implementado

### Manifesto

Arquivo: `app/manifest.ts`

Definições aplicadas:

- `name` e `short_name` da marca;
- `start_url` e `scope` na raiz da aplicação;
- `display: "standalone"`;
- `theme_color` e `background_color` alinhados ao tema escuro atual;
- ícones `192x192`, `512x512` e `maskable`.

### Metadados do app

Arquivo: `app/layout.tsx`

Foi adicionada a configuração de:

- `manifest`;
- `applicationName`;
- `icons`;
- `appleWebApp`;
- `viewport.themeColor`.

### Ícones gerados

Arquivos em `public/`:

- `pwa-192x192.png`
- `pwa-512x512.png`
- `pwa-maskable-512x512.png`
- `apple-touch-icon.png`
- `favicon-32x32.png`

Base visual usada:

- `public/pwa_brabus.png`
- `public/favicon.png`

## Estratégia do ícone

O símbolo do crânio foi adotado como identidade do PWA porque:

- funciona sem depender do texto da marca;
- preserva leitura em atalhos, home screen e desktop;
- comunica a identidade da loja com mais força do que a logo horizontal.

A versão `maskable` recebeu margem interna e fundo escuro para reduzir risco de corte agressivo em launchers Android.

## Fallback offline mínimo

Arquivos:

- `public/sw.js`
- `public/offline.html`
- `components/PwaRegistration.tsx`

Comportamento:

- o service worker é registrado no cliente apenas em produção;
- o manifesto, os ícones e o arquivo `offline.html` entram no cache inicial;
- quando uma navegação falha por ausência de rede, o app responde com `offline.html`.

## Limites desta primeira entrega

Esta implementação cobre o mínimo previsto no plano. Ainda não cobre:

- cache offline de catálogo, carrinho ou checkout;
- sincronização em background;
- estratégia avançada de atualização de assets;
- experiência offline transacional.

## Validação recomendada

Rodar em build de produção:

1. `npm run build`
2. `npm run start`
3. abrir a aplicação no Chrome ou Edge
4. verificar se o navegador oferece instalação
5. instalar o app
6. desligar a rede e tentar abrir uma rota nova para validar o fallback offline

## Relação com o backlog

Status operacional da `TASK-S2-APP-01`:

- implementado: `manifest`
- implementado: ícones
- implementado: metadados de instalação
- implementado: fallback offline mínimo
- pendente: validação manual em desktop e mobile
