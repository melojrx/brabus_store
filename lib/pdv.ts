import { hash } from "bcryptjs"
import { PrismaClient, Role, ShippingType } from "@prisma/client"
import { z } from "zod"

export const PDV_PAYMENT_METHOD_VALUES = [
  "CASH",
  "MANUAL_PIX",
  "POS_DEBIT",
  "POS_CREDIT",
] as const

export const PDV_PAYMENT_STATUS_VALUES = ["PENDING", "PAID"] as const
export const PDV_SHIPPING_TYPE_VALUES = [
  ShippingType.PICKUP,
  ShippingType.LOCAL_DELIVERY,
  ShippingType.NATIONAL,
] as const

export const PDV_WALK_IN_CUSTOMER_EMAIL = "pdv-balcao@brabus.local"
const PDV_WALK_IN_CUSTOMER_PASSWORD = "pdv-balcao-interno"

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

export function normalizePdvText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

export const createPdvOrderSchema = z
  .object({
    customerId: z
      .string()
      .trim()
      .optional()
      .nullable()
      .or(z.literal(""))
      .transform((value) => value || null),
    customerName: optionalTrimmedString(120, "O nome do cliente deve ter no máximo 120 caracteres."),
    customerEmail: optionalTrimmedString(160, "O e-mail deve ter no máximo 160 caracteres."),
    customerPhone: optionalTrimmedString(40, "O telefone deve ter no máximo 40 caracteres."),
    items: z
      .array(
        z.object({
          productId: z.string().min(1, "Produto inválido."),
          productVariantId: z.string().min(1, "Variação inválida."),
          quantity: z.number().int().positive("Quantidade inválida."),
        }),
      )
      .min(1, "Adicione ao menos um item ao pedido."),
    shippingType: z.enum(PDV_SHIPPING_TYPE_VALUES),
    shippingServiceId: z
      .string()
      .trim()
      .optional()
      .nullable()
      .or(z.literal(""))
      .transform((value) => value || null),
    address: z.object({
      addressStreet: optionalTrimmedString(160, "A rua deve ter no máximo 160 caracteres."),
      addressNumber: optionalTrimmedString(30, "O número deve ter no máximo 30 caracteres."),
      addressComplement: optionalTrimmedString(160, "O complemento deve ter no máximo 160 caracteres."),
      addressNeighborhood: optionalTrimmedString(120, "O bairro deve ter no máximo 120 caracteres."),
      addressCity: optionalTrimmedString(120, "A cidade deve ter no máximo 120 caracteres."),
      addressState: optionalTrimmedString(80, "O estado deve ter no máximo 80 caracteres."),
      addressZip: optionalTrimmedString(20, "O CEP deve ter no máximo 20 caracteres."),
    }),
    paymentMethod: z.enum(PDV_PAYMENT_METHOD_VALUES),
    paymentStatus: z.enum(PDV_PAYMENT_STATUS_VALUES),
    paymentInstallments: z
      .union([z.number().int(), z.string(), z.null(), z.undefined()])
      .transform((value, ctx) => {
        if (value == null || value === "") {
          return null
        }

        const parsed = typeof value === "number" ? value : Number.parseInt(value, 10)

        if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 12) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Informe um parcelamento válido entre 1 e 12x.",
          })
          return z.NEVER
        }

        return parsed
      }),
    manualPaymentReference: optionalTrimmedString(120, "A referência deve ter no máximo 120 caracteres."),
    manualPaymentNotes: optionalTrimmedString(1000, "As observações devem ter no máximo 1000 caracteres."),
    cashReceivedAmount: optionalMoneyField,
    changeAmount: optionalMoneyField,
  })
  .superRefine((data, ctx) => {
    if (data.paymentMethod === "MANUAL_PIX" && data.paymentStatus === "PAID" && !data.manualPaymentReference) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe a referência do Pix manual antes de concluir o pagamento.",
        path: ["manualPaymentReference"],
      })
    }

    if (data.paymentMethod === "POS_CREDIT" && !data.paymentInstallments) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe o parcelamento do cartão de crédito.",
        path: ["paymentInstallments"],
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

type PdvUserClient = Pick<PrismaClient, "user">

export async function ensurePdvWalkInCustomer(prisma: PdvUserClient) {
  const passwordHash = await hash(PDV_WALK_IN_CUSTOMER_PASSWORD, 10)

  return prisma.user.upsert({
    where: { email: PDV_WALK_IN_CUSTOMER_EMAIL },
    update: {
      name: "Cliente Balcão",
      role: Role.CUSTOMER,
    },
    create: {
      name: "Cliente Balcão",
      email: PDV_WALK_IN_CUSTOMER_EMAIL,
      password: passwordHash,
      role: Role.CUSTOMER,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
    },
  })
}

export function buildVariantDisplayLabel(variant: {
  name?: string | null
  size?: string | null
  color?: string | null
  flavor?: string | null
}) {
  const parts = [
    variant.name && variant.name !== "Default" ? variant.name : null,
    variant.size ?? null,
    variant.color ?? null,
    variant.flavor ?? null,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(" / ") : "Padrão"
}
