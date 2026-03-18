import { PaymentMethod } from "@prisma/client"
import Stripe from "stripe"

const ALLOWED_CHECKOUT_PAYMENT_METHOD_TYPES = new Set<Stripe.Checkout.SessionCreateParams.PaymentMethodType>([
  "card",
  "boleto",
  "pix",
])

function assertStripeSecretKey() {
  const secretKey = process.env.STRIPE_SECRET_KEY

  if (!secretKey || secretKey === "sk_test_..." || secretKey === "sk_live_...") {
    throw new Error("STRIPE_SECRET_KEY não configurada corretamente.")
  }

  return secretKey
}

let stripeSingleton: Stripe | null = null

export function getStripeServerClient() {
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(assertStripeSecretKey(), {
      apiVersion: "2024-09-30.acacia" as Stripe.LatestApiVersion,
    })
  }

  return stripeSingleton
}

export function isStripeTestEnvironmentConfigured() {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  const secretKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  return Boolean(
    publishableKey &&
      secretKey &&
      webhookSecret &&
      publishableKey !== "pk_test_..." &&
      secretKey !== "sk_test_..." &&
      webhookSecret !== "whsec_...",
  )
}

export function getStripeCheckoutPaymentMethodTypes() {
  const rawValue = process.env.STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES

  if (!rawValue) {
    return ["card"] satisfies Stripe.Checkout.SessionCreateParams.PaymentMethodType[]
  }

  const methods = rawValue
    .split(",")
    .map((value) => value.trim())
    .filter(
      (value): value is Stripe.Checkout.SessionCreateParams.PaymentMethodType =>
        ALLOWED_CHECKOUT_PAYMENT_METHOD_TYPES.has(
          value as Stripe.Checkout.SessionCreateParams.PaymentMethodType,
        ),
    )

  if (methods.length === 0) {
    return ["card"] satisfies Stripe.Checkout.SessionCreateParams.PaymentMethodType[]
  }

  return methods
}

export function inferOrderPaymentMethodFromCheckoutConfig(
  methods: readonly Stripe.Checkout.SessionCreateParams.PaymentMethodType[],
) {
  if (methods.length === 1 && methods[0] === "pix") {
    return PaymentMethod.STRIPE_PIX
  }

  return PaymentMethod.STRIPE_CARD
}
