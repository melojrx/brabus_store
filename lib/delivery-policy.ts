type DeliveryLocation = {
  addressCity?: string | null
  addressState?: string | null
}

type DeliveryAddress = DeliveryLocation & {
  addressStreet?: string | null
  addressNumber?: string | null
  addressNeighborhood?: string | null
  addressZip?: string | null
}

type ResolveDeliveryInput = {
  shippingType: "PICKUP" | "LOCAL_DELIVERY" | "NATIONAL"
  address?: DeliveryAddress
  store: DeliveryLocation
}

export class DeliveryPolicyError extends Error {}

export function normalizeLocation(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleUpperCase("pt-BR")
}

export function normalizePostalCode(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "")
}

function hasMatchingStoreLocation(address: DeliveryLocation | undefined, store: DeliveryLocation) {
  const addressCity = normalizeLocation(address?.addressCity)
  const addressState = normalizeLocation(address?.addressState)
  const storeCity = normalizeLocation(store.addressCity)
  const storeState = normalizeLocation(store.addressState)

  return Boolean(addressCity && addressState && storeCity && storeState && addressCity === storeCity && addressState === storeState)
}

export function isDeliveryReady({ shippingType, address, store }: ResolveDeliveryInput) {
  if (shippingType === "PICKUP") {
    return true
  }

  if (shippingType !== "LOCAL_DELIVERY") {
    return false
  }

  return Boolean(
      normalizeLocation(address?.addressStreet) &&
      normalizeLocation(address?.addressNumber) &&
      normalizeLocation(address?.addressNeighborhood) &&
      normalizePostalCode(address?.addressZip).length === 8 &&
      hasMatchingStoreLocation(address, store),
  )
}

export function resolveDelivery({ shippingType, address, store }: ResolveDeliveryInput) {
  if (shippingType === "PICKUP") {
    return {
      cost: 0,
      carrier: "Retirada na Loja",
      deadline: "Retirada imediata",
    }
  }

  if (shippingType !== "LOCAL_DELIVERY") {
    throw new DeliveryPolicyError("A modalidade de entrega selecionada não está disponível.")
  }

  if (!hasMatchingStoreLocation(address, store)) {
    throw new DeliveryPolicyError("A Entrega Braba está disponível somente para a cidade da loja.")
  }

  return {
    cost: 0,
    carrier: "Entrega Braba",
    deadline: "A confirmar pela loja",
  }
}
