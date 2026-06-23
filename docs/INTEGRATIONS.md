# Integration API

API pública autenticada por API key para integrações externas (Neo, WhatsApp, webhooks).

## Base URL

```
/api/v1/integrations
```

## Autenticação

Todas as rotas exigem header:

```
Authorization: Bearer <API_KEY>
```

### Como gerar uma API key

1. Login como admin
2. Navegar para **Admin → Desenvolvedor → API Keys**
3. Clicar em "Nova API Key"
4. Preencher nome, actor e selecionar scopes
5. Copiar a chave exibida (não será mostrada novamente)

### Scopes disponíveis (MVP)

| Scope | Descrição |
|-------|-----------|
| `read:dashboard` | Métricas e gráficos do dashboard |
| `read:orders` | Listagem e detalhes de pedidos |
| `read:products` | Listagem e detalhes de produtos |
| `read:stock` | Consulta de estoque baixo |
| `read:categories` | Árvore de categorias |
| `read:settings` | Configurações públicas da loja |

## Formato de Resposta

### Sucesso

```json
{
  "ok": true,
  "data": { ... },
  "meta": { ... }
}
```

### Erro

```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "error": "Missing or invalid Authorization header."
}
```

### Códigos de erro

| Código | HTTP | Descrição |
|--------|------|-----------|
| `UNAUTHORIZED` | 401 | Token ausente, inválido ou revogado |
| `FORBIDDEN` | 403 | Token válido mas sem scope necessário |
| `NOT_FOUND` | 404 | Recurso não encontrado |
| `INTERNAL_ERROR` | 500 | Erro interno do servidor |

---

## Endpoints

### Health

```bash
curl -s https://brabustore.com.br/api/v1/integrations/health \
  -H "Authorization: Bearer $BRABUS_STORE_API_KEY"
```

Scope: qualquer API key ativa (sem scope específico).

### Dashboard

```bash
curl -s "https://brabustore.com.br/api/v1/integrations/dashboard?period=7d" \
  -H "Authorization: Bearer $BRABUS_STORE_API_KEY"
```

Scope: `read:dashboard`

Parâmetros: `?period=today|7d|30d|6m|12m|all`

### Orders (lista)

```bash
curl -s "https://brabustore.com.br/api/v1/integrations/orders?status=PAID&page=1&pageSize=10" \
  -H "Authorization: Bearer $BRABUS_STORE_API_KEY"
```

Scope: `read:orders`

Parâmetros:
- `status` — PENDING, PAID, SHIPPED, DELIVERED, CANCELLED, REFUNDED, FAILED
- `paymentStatus` — PENDING, PAID, FAILED, CANCELLED, REFUNDED
- `channel` — ONLINE, PDV, LEGACY
- `page` — página (default: 1)
- `pageSize` — itens por página (default: 20, max: 50)

### Orders (detalhe)

```bash
curl -s "https://brabustore.com.br/api/v1/integrations/orders/ON-260515-0001" \
  -H "Authorization: Bearer $BRABUS_STORE_API_KEY"
```

Scope: `read:orders`

Aceita `id` (cuid) ou `orderNumber` (ex: ON-260515-0001).

### Products (lista)

```bash
curl -s "https://brabustore.com.br/api/v1/integrations/products?search=whey&active=true&page=1" \
  -H "Authorization: Bearer $BRABUS_STORE_API_KEY"
```

Scope: `read:products`

Parâmetros:
- `search` — busca por nome/descrição/slug
- `active` — true/false
- `lowStock` — true (filtra produtos com variante ≤10 unidades)
- `page`, `pageSize` (max: 50)

### Products (detalhe)

```bash
curl -s "https://brabustore.com.br/api/v1/integrations/products/whey-protein-900g" \
  -H "Authorization: Bearer $BRABUS_STORE_API_KEY"
```

Scope: `read:products`

Aceita `id` (cuid) ou `slug`.

### Stock Low

```bash
curl -s "https://brabustore.com.br/api/v1/integrations/stock/low?threshold=5" \
  -H "Authorization: Bearer $BRABUS_STORE_API_KEY"
```

Scope: `read:stock`

Parâmetros: `threshold` (default: 3)

### Stock Expiring

```bash
curl -s "https://brabustore.com.br/api/v1/integrations/stock/expiring?level=critical" \
  -H "Authorization: Bearer $BRABUS_STORE_API_KEY"
```

Scope: `read:stock`

Parâmetros: `level` (`warning`, `critical`, `expired`; omitir para todos os níveis)

Retorna variantes com estoque ativo em categorias que rastreiam validade.

### Categories

```bash
curl -s "https://brabustore.com.br/api/v1/integrations/categories" \
  -H "Authorization: Bearer $BRABUS_STORE_API_KEY"
```

Scope: `read:categories`

Retorna árvore de categorias ativas com subcategorias.

### Settings

```bash
curl -s "https://brabustore.com.br/api/v1/integrations/settings" \
  -H "Authorization: Bearer $BRABUS_STORE_API_KEY"
```

Scope: `read:settings`

Retorna configurações operacionais (endereço, WhatsApp, Instagram, horários). Não retorna segredos.

---

## Variáveis de Ambiente (opcional)

| Variável | Descrição |
|----------|-----------|
| `INTEGRATION_API_KEY_PEPPER` | Pepper adicional para hash das API keys. Opcional em dev. |

---

## TODO — v1 (pós-MVP)

- `PATCH /api/v1/integrations/orders/[id]/tracking`
- `PATCH /api/v1/integrations/orders/[id]/status`
- `PATCH /api/v1/integrations/products/[id]/toggle`
- `POST /api/v1/integrations/products`
- `PATCH /api/v1/integrations/products/[id]`
- `POST /api/v1/integrations/pdv/orders`
- Scopes de escrita (`write:orders`, `write:products`, `write:pdv`)
- Rate limiting
- Webhook delivery engine
