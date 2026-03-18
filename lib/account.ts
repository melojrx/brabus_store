import { z } from "zod"

const optionalTrimmedString = z.string().trim().optional().transform((value) => {
  if (!value) {
    return null
  }

  return value
})

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2, "Informe um nome válido."),
  email: z.string().trim().email("Informe um e-mail válido."),
  phone: z
    .string()
    .trim()
    .min(10, "Informe um telefone com DDD.")
    .max(20, "Telefone inválido.")
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : null)),
  addressStreet: optionalTrimmedString,
  addressNumber: optionalTrimmedString,
  addressComplement: optionalTrimmedString,
  addressNeighborhood: optionalTrimmedString,
  addressCity: optionalTrimmedString,
  addressState: z
    .string()
    .trim()
    .max(2, "Use a sigla do estado com 2 letras.")
    .optional()
    .or(z.literal(""))
    .transform((value) => {
      if (!value) {
        return null
      }

      return value.toUpperCase()
    }),
  addressZip: z
    .string()
    .trim()
    .max(9, "CEP inválido.")
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : null)),
})

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual."),
    newPassword: z.string().min(6, "A nova senha deve ter pelo menos 6 caracteres."),
    confirmPassword: z.string().min(6, "Confirme a nova senha."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "A confirmação da senha não confere.",
    path: ["confirmPassword"],
  })

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
})

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(1, "Token inválido."),
    password: z.string().min(6, "A nova senha deve ter pelo menos 6 caracteres."),
    confirmPassword: z.string().min(6, "Confirme a nova senha."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "A confirmação da senha não confere.",
    path: ["confirmPassword"],
  })

export function normalizePhone(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const digits = value.replace(/\D/g, "")
  return digits.length > 0 ? digits : null
}

export function formatPhone(value: string | null | undefined) {
  const digits = value?.replace(/\D/g, "") ?? ""

  if (digits.length <= 2) {
    return digits
  }

  if (digits.length <= 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6, 10)}`
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`
}

export function normalizeZip(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const digits = value.replace(/\D/g, "")
  if (digits.length === 0) {
    return null
  }

  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5, 8)}` : digits
}

export function serializeAccountProfile(user: {
  id: string
  name: string
  email: string
  phone: string | null
  addressStreet: string | null
  addressNumber: string | null
  addressComplement: string | null
  addressNeighborhood: string | null
  addressCity: string | null
  addressState: string | null
  addressZip: string | null
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    addressStreet: user.addressStreet,
    addressNumber: user.addressNumber,
    addressComplement: user.addressComplement,
    addressNeighborhood: user.addressNeighborhood,
    addressCity: user.addressCity,
    addressState: user.addressState,
    addressZip: user.addressZip,
  }
}
