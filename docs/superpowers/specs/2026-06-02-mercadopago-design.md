# Design: Integração Mercado Pago — Checkout API

**Data:** 2026-06-02
**Status:** Aprovado
**Responsável:** Junior Melo

---

## 1. Visão Geral

Substituir Stripe por Mercado Pago para pagamentos online. Checkout API (transparente) com Pix instantâneo e cartão via Payment Brick. Webhook para confirmação automática. PDV fica para fase 2.

---

## 2. Objetivos

- Eliminar dependência Stripe
- Confirmação Pix automática (substituir Pix manual)
- Cartão via Payment Brick (iframe MP, menor compliance burden)
- Webhook para atualização de status em tempo real
- Mantener identidade visual da loja no QR code Pix

---

## 3. Arquitetura

### 3.1 Stack

- **Frontend:** Next.js 16 + React 19 + TypeScript
- **Backend:** Next.js API Routes
- **Pagamentos:** Mercado Pago Checkout API
 - Pix: API pura + QR code customizado
  - Cartão: Payment Brick (iframe MP)
- **Banco:** PostgreSQL + Prisma

### 3.2 Estrutura de Arquivos

```
lib/mercadopago/
├── client.ts          # Cliente SDK MP
├── webhook.ts        # Validação HMAC + processamento
├── pix.ts            # Geração QR code base64
└── types.ts          # Tipos compartilhados

app/api/mercadopago/
├── webhook/route.ts  # Recebe notificações MP
└── payment/[id]/route.ts  # Consulta status

app/checkout/
├── CheckoutPageClient.tsx  # Atualizado
└── pix/QrCodeDisplay.tsx   # Componente QR code

app/checkout/success/page.tsx  # Atualizado
```

### 3.3 Remoções

| Arquivo | Ação |
|---------|-------|
| `lib/stripe.ts` | Delete |
| `lib/stripe-webhook.ts` | Delete |
| Dependências Stripe (`stripe`, `@stripe/stripe-js`) | Remove de package.json |
| Configurações .env Stripe | Comenta/remove |
| `stripeSessionId` em Order | Manter coluna, ignorar em queries |

---

## 4. Fluxo de Pagamento

### 4.1 Pix

```
1. Usuário seleciona Pix
2. Frontend → POST /api/checkout
3. Backend → MP API: criar preference com pagamento Pix
4. Backend → MP API: gerar QR code (point_of_interface)
5. Backend → retorna { qrCodeBase64, qrCodeText, paymentId }
6. Frontend → exibe QR code + botão copiar texto
7. MP notifica webhook → status updated
```

### 4.2 Cartão

```
1. Usuário seleciona cartão
2. Frontend → POST /api/checkout
3. Backend → MP API: criar preference
4. Backend → retorna { preferenceId }
5. Frontend → inicializa Payment Brick com preferenceId
6. Usuário preenche dados no iframe MP
7. MP processa → webhook notifica → status updated
```

### 4.3 Webhook

```
POST /api/mercadopago/webhook
├── Validar assinatura HMAC SHA256
├── Mapear topic → evento
├── Atualizar Order.paymentStatus
└── Retornar 200 para MP parar retries
```

---

## 5. Mapeamento de Status

| Mercado Pago | Order.paymentStatus |
|--------------|---------------------|
| `pending` | `PENDING` |
| `approved` | `PAID` |
| `rejected` | `FAILED` |
| `cancelled` | `CANCELLED` |
| `refunded` | `REFUNDED` |

---

## 6. Configurações

###6.1 Variáveis de Ambiente

```env
# Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN=TEST-...
MERCADO_PAGO_PUBLIC_KEY=TEST-...
MERCADO_PAGO_INTEGRATION_TYPE=regular
MERCADO_PAGO_ENVIRONMENT=sandbox  # ou production
```

### 6.2 Admin Settings

Adicionar em `SettingsForm.tsx`:
- Toggle ativo/inativo
- Access Token (teste/produção)
- Modo sandbox/produção

---

## 7. Validação Webhook

```typescript
// Header: X-Signature
// Header: X-Signature-Date
// Validar: HMAC SHA256(topic + "|" + X-Signature-Date, ACCESS_TOKEN)
```

---

## 8. Dependências Novas

```json
{
  "mercadopago": "^2.0.0",
  "qrcode": "^1.5.3"
}
```

---

## 9. Fase 2 (Fora de Escopo)

- PDV integrado com Mercado Pago
- Split payments
- Assinaturas/subscription

---

## 10. Critérios de Sucesso

- [ ] Pix funcionando com QR code customizado
- [ ] Cartão funcionando via Payment Brick
- [ ] Webhook atualizando status automaticamente
- [ ] Stripe removido do código
- [ ] Testes em ambiente sandbox
- [ ] Configurações admin funcionais
