export type SerializedSupplier = {
  id: string
  name: string
  email: string | null
  phone: string | null
  cpf: string | null
  cnpj: string | null
  personType: string | null
  stateRegistration: string | null
  contactName: string | null
  addressStreet: string | null
  addressNumber: string | null
  addressComplement: string | null
  addressNeighborhood: string | null
  addressCity: string | null
  addressState: string | null
  addressZip: string | null
  notes: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export function serializeSupplier(supplier: {
  id: string
  name: string
  email: string | null
  phone: string | null
  cpf: string | null
  cnpj: string | null
  personType: string | null
  stateRegistration: string | null
  contactName: string | null
  addressStreet: string | null
  addressNumber: string | null
  addressComplement: string | null
  addressNeighborhood: string | null
  addressCity: string | null
  addressState: string | null
  addressZip: string | null
  notes: string | null
  active: boolean
  createdAt: Date
  updatedAt: Date
}): SerializedSupplier {
  return {
    ...supplier,
    createdAt: supplier.createdAt.toISOString(),
    updatedAt: supplier.updatedAt.toISOString(),
  }
}
