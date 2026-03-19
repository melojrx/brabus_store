import { ShippingType } from "@prisma/client"
import { z } from "zod"

export const PUBLIC_CHECKOUT_PAYMENT_METHOD_VALUES = [
  "STRIPE_CARD",
  "MANUAL_PIX",
  "CASH",
] as const

export type PublicCheckoutPaymentMethodValue =
  (typeof PUBLIC_CHECKOUT_PAYMENT_METHOD_VALUES)[number]

const checkoutItemSchema = z.object({
  productId: z.string().trim().min(1, "Produto inválido."),
  productName: z.string().trim().optional(),
  productVariantId: z
    .string()
    .trim()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((value) => value || null),
  quantity: z.number().int().positive("Quantidade inválida."),
  selectedSize: z.string().trim().optional().nullable(),
  selectedColor: z.string().trim().optional().nullable(),
  selectedFlavor: z.string().trim().optional().nullable(),
})

function optionalTrimmedString(max: number, message: string) {
  return z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((value) => {
      if (!value) {
        return null
      }

      return value.trim()
    })
}

const optionalMoneyField = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((value, ctx) => {
    if (value == null || value === "") {
      return null
    }

    const parsed = typeof value === "number" ? value : Number(String(value).replace(",", "."))

    if (!Number.isFinite(parsed) || parsed < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Valor monetário inválido.",
      })
      return z.NEVER
    }

    return Number(parsed.toFixed(2))
  })

export const createPublicCheckoutSchema = z
  .object({
    items: z.array(checkoutItemSchema).min(1, "Carrinho está vazio."),
    shippingType: z.nativeEnum(ShippingType),
    shippingServiceId: z
      .string()
      .trim()
      .optional()
      .nullable()
      .or(z.literal(""))
      .transform((value) => value || null),
    paymentMethod: z.enum(PUBLIC_CHECKOUT_PAYMENT_METHOD_VALUES),
    cashReceivedAmount: optionalMoneyField,
    address: z.object({
      addressStreet: optionalTrimmedString(160, "A rua deve ter no máximo 160 caracteres."),
      addressNumber: optionalTrimmedString(30, "O número deve ter no máximo 30 caracteres."),
      addressComplement: optionalTrimmedString(160, "O complemento deve ter no máximo 160 caracteres."),
      addressNeighborhood: optionalTrimmedString(120, "O bairro deve ter no máximo 120 caracteres."),
      addressCity: optionalTrimmedString(120, "A cidade deve ter no máximo 120 caracteres."),
      addressState: optionalTrimmedString(80, "O estado deve ter no máximo 80 caracteres."),
      addressZip: optionalTrimmedString(20, "O CEP deve ter no máximo 20 caracteres."),
    }),
  })
  .superRefine((data, ctx) => {
    if (
      data.shippingType === ShippingType.NATIONAL &&
      data.paymentMethod !== "STRIPE_CARD"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Entrega nacional aceita apenas pagamento online.",
        path: ["paymentMethod"],
      })
    }

    if (data.shippingType !== ShippingType.PICKUP) {
      const requiredFields: Array<keyof typeof data.address> = [
        "addressStreet",
        "addressNumber",
        "addressNeighborhood",
        "addressCity",
        "addressState",
        "addressZip",
      ]

      for (const field of requiredFields) {
        if (!data.address[field]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Preencha o endereço de entrega completo.",
            path: ["address", field],
          })
        }
      }
    }

    if (data.shippingType === ShippingType.NATIONAL && !data.shippingServiceId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecione um serviço de frete para entrega nacional.",
        path: ["shippingServiceId"],
      })
    }
  })

export type PublicCheckoutPayload = z.infer<typeof createPublicCheckoutSchema>
export type CheckoutItemInput = PublicCheckoutPayload["items"][number]
export type NormalizedCheckoutAddress = PublicCheckoutPayload["address"]

function normalizeText(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

export function normalizePostalCode(value: string) {
  return value.replace(/\D/g, "").slice(0, 8)
}

export function validateRequiredAddressFields(address: NormalizedCheckoutAddress) {
  const missingFields: string[] = []

  if (!address.addressStreet) missingFields.push("rua")
  if (!address.addressNumber) missingFields.push("numero")
  if (!address.addressNeighborhood) missingFields.push("bairro")
  if (!address.addressCity) missingFields.push("cidade")
  if (!address.addressState) missingFields.push("estado")
  if (!address.addressZip) missingFields.push("CEP")

  return missingFields
}

export function resolveVariant(
  variants: Array<{
    id: string
    name: string | null
    size: string | null
    color: string | null
    flavor: string | null
    stock: number
    active: boolean
  }>,
  item: CheckoutItemInput,
) {
  const activeVariants = variants.filter((variant) => variant.active)

  if (activeVariants.length === 0) {
    return null
  }

  if (item.productVariantId) {
    return activeVariants.find((variant) => variant.id === item.productVariantId) ?? null
  }

  if (activeVariants.length === 1) {
    return activeVariants[0]
  }

  const selectedSize = normalizeText(item.selectedSize)
  const selectedColor = normalizeText(item.selectedColor)
  const selectedFlavor = normalizeText(item.selectedFlavor)

  const requiresSize = new Set(activeVariants.map((variant) => variant.size).filter(Boolean)).size > 1
  const requiresColor = new Set(activeVariants.map((variant) => variant.color).filter(Boolean)).size > 1
  const requiresFlavor = new Set(activeVariants.map((variant) => variant.flavor).filter(Boolean)).size > 1

  if ((requiresSize && !selectedSize) || (requiresColor && !selectedColor) || (requiresFlavor && !selectedFlavor)) {
    return null
  }

  return (
    activeVariants.find(
      (variant) =>
        (!selectedSize || variant.size === selectedSize) &&
        (!selectedColor || variant.color === selectedColor) &&
        (!selectedFlavor || variant.flavor === selectedFlavor),
    ) ?? null
  )
}

export function buildVariantLabel(item: CheckoutItemInput, variantName: string | null) {
  const parts = [
    variantName && variantName !== "Default" ? variantName : null,
    normalizeText(item.selectedSize),
    normalizeText(item.selectedColor),
    normalizeText(item.selectedFlavor),
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(" / ") : null
}
