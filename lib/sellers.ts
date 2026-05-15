export type SerializedSeller = {
  id: string
  name: string
  email: string | null
  phone: string | null
  cpf: string | null
  active: boolean
  notes: string | null
  createdAt: string
  updatedAt: string
}

export function serializeSeller(seller: {
  id: string
  name: string
  email: string | null
  phone: string | null
  cpf: string | null
  active: boolean
  notes: string | null
  createdAt: Date
  updatedAt: Date
}): SerializedSeller {
  return {
    ...seller,
    createdAt: seller.createdAt.toISOString(),
    updatedAt: seller.updatedAt.toISOString(),
  }
}
