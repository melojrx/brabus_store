# Integrations

## Stripe
Obrigatórias:
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES` (ex.: `card` ou `card,pix`)

Eventos recomendados no webhook:
- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- `payment_intent.payment_failed`
- `charge.refunded`

Fluxo local:
1. Rode `npm run dev`.
2. Em outro terminal, rode `npm run stripe:listen`.
3. Copie o `whsec_...` exibido pela Stripe CLI para `STRIPE_WEBHOOK_SECRET`.
4. Reinicie o app após trocar a variável.
5. Valide um pedido real de teste e confirme transição `PENDING -> PAID`.

Estoque e estados financeiros:
- O estoque baixa apenas quando o pedido entra em `PAID`.
- No admin, se o pagamento mudar de `PAID -> CANCELLED` ou `PAID -> REFUNDED`, o estoque da variacao volta automaticamente.
- Essa reposicao e idempotente: ela so acontece quando o estado anterior era `PAID`.
- Refunds completos recebidos da Stripe via `charge.refunded` tambem marcam o pedido como `REFUNDED` e devolvem o estoque automaticamente.
- Alterar apenas o `status` operacional do pedido no admin nao movimenta estoque; a devolucao depende da transicao de `paymentStatus` ou do webhook da Stripe.

## Melhor Envio
Variáveis:
- `MELHOR_ENVIO_TOKEN`
- `MELHOR_ENVIO_BASE_URL` opcional; sem ela usamos `sandbox` fora de produção.

Situação atual:
- O cálculo nacional já está implementado.
- A validação ponta a ponta depende da URL pública de homologação/produção para concluir o onboarding e obter token definitivo.
- Até lá, trate o Melhor Envio como parcialmente bloqueado para go-live.

## Instagram
Opção 1, feed real:
- `INSTAGRAM_ACCESS_TOKEN`

Opção 2, fallback curado:
- `INSTAGRAM_FALLBACK_POSTS`

Formato de `INSTAGRAM_FALLBACK_POSTS`:

```json
[
  {
    "id": "post-1",
    "media_url": "https://example.com/post-1.jpg",
    "permalink": "https://instagram.com/p/xxxxx"
  }
]
```

Sem token e sem fallback, a home mostra apenas o link do perfil.

## Validação Operacional
Rode:

```bash
npm run integrations:check
```

O script valida:
- Stripe com chamada remota usando a chave secreta atual
- Melhor Envio quando houver token configurado
- Instagram real via Graph API ou, na ausência disso, o fallback curado

O script só falha com código não zero quando uma integração obrigatória bloqueante, como Stripe, estiver quebrada.
