"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  Banknote,
  Box,
  CreditCard,
  LoaderCircle,
  MapPin,
} from "lucide-react"
import { useCartStore } from "@/store/cartStore"

type CheckoutAddress = {
  addressStreet: string
  addressNumber: string
  addressComplement: string
  addressNeighborhood: string
  addressCity: string
  addressState: string
  addressZip: string
}

type AddressLookupResult = {
  cep: string
  street: string
  neighborhood: string
  city: string
  state: string
  complement: string
}

type ShippingTypeValue = "PICKUP" | "LOCAL_DELIVERY"
type PublicCheckoutPaymentMethod = "MERCADO_PAGO_CARD" | "MERCADO_PAGO_PIX" | "CASH"

const addressInputCls =
  "w-full rounded-sm border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-[var(--color-primary)]"

const initialAddress: CheckoutAddress = {
  addressStreet: "",
  addressNumber: "",
  addressComplement: "",
  addressNeighborhood: "",
  addressCity: "",
  addressState: "",
  addressZip: "",
}

function normalizePostalCode(value: string) {
  return value.replace(/\D/g, "").slice(0, 8)
}

function formatPostalCode(value: string) {
  const digits = normalizePostalCode(value)
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits
}

function normalizeLocationText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
}

function formatCurrency(value: number | string | null | undefined) {
  const numericValue = typeof value === "number" ? value : Number(value)
  const safeValue = Number.isFinite(numericValue) ? numericValue : 0
  return `R$ ${safeValue.toFixed(2).replace(".", ",")}`
}

function parseMoneyInput(value: string) {
  if (!value.trim()) {
    return null
  }

  const parsed = Number(value.replace(",", "."))
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : null
}

function getPaymentActionLabel(paymentMethod: PublicCheckoutPaymentMethod) {
  if (paymentMethod === "MERCADO_PAGO_PIX" || paymentMethod === "MERCADO_PAGO_CARD") {
    return "Continuar para pagamento seguro"
  }
  if (paymentMethod === "CASH") {
    return "Confirmar pedido em dinheiro"
  }
  return "Confirmar"
}

export function getLocalDeliveryHelperText({
  hasMatchingStoreLocation,
  isLocalDeliveryAvailable,
  addressCity,
  addressState,
}: {
  hasMatchingStoreLocation: boolean
  isLocalDeliveryAvailable: boolean
  addressCity: string
  addressState: string
}) {
  if (!hasMatchingStoreLocation) {
    return `A Entrega Braba está disponível somente para ${addressCity} - ${addressState}.`
  }

  if (!isLocalDeliveryAvailable) {
    return "Preencha o endereço completo para liberar esta opção."
  }

  return `Disponível para ${addressCity} - ${addressState}. Prazo a confirmar pela loja.`
}

export function isLocalDeliveryAvailable({
  hasCompleteAddress,
  hasMatchingStoreLocation,
  addressZip,
}: {
  hasCompleteAddress: boolean
  hasMatchingStoreLocation: boolean
  addressZip: string
}) {
  return hasCompleteAddress && hasMatchingStoreLocation && addressZip.replace(/\D/g, "").length === 8
}

export default function CheckoutPageClient({
  addressCity,
  addressState,
}: {
  addressCity: string
  addressState: string
}) {
  const { items, getTotal } = useCartStore()
  const { status } = useSession()
  const router = useRouter()

  const [shippingType, setShippingType] = useState<ShippingTypeValue>("PICKUP")
  const [paymentMethod, setPaymentMethod] = useState<PublicCheckoutPaymentMethod>("MERCADO_PAGO_CARD")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [cashReceivedAmount, setCashReceivedAmount] = useState("")
  const [address, setAddress] = useState<CheckoutAddress>(initialAddress)
  const [addressLookupError, setAddressLookupError] = useState("")
  const [addressLookupLoading, setAddressLookupLoading] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin?callbackUrl=/checkout")
    }
  }, [status, router])

  const zipDigits = normalizePostalCode(address.addressZip)
  const requiresAddress = shippingType !== "PICKUP"
  const hasMatchingStoreLocation =
    Boolean(address.addressCity.trim() && address.addressState.trim()) &&
    normalizeLocationText(address.addressCity) === normalizeLocationText(addressCity) &&
    normalizeLocationText(address.addressState) === normalizeLocationText(addressState)
  const hasCompleteAddress = [
    address.addressStreet,
    address.addressNumber,
    address.addressNeighborhood,
    address.addressCity,
    address.addressState,
    address.addressZip,
  ].every((value) => value.trim().length > 0)
  const localDeliveryAvailable = isLocalDeliveryAvailable({
    hasCompleteAddress,
    hasMatchingStoreLocation,
    addressZip: address.addressZip,
  })

  const resolvedShipping =
    shippingType === "PICKUP"
      ? {
          cost: 0,
          carrier: "Retirada na Loja",
          deadline: "Retirada imediata",
        }
      : {
          cost: 0,
          carrier: "Entrega Braba",
          deadline: "A confirmar pela loja",
        }

  useEffect(() => {
    if (shippingType === "LOCAL_DELIVERY" && !localDeliveryAvailable) {
      setShippingType("PICKUP")
    }
  }, [localDeliveryAvailable, shippingType])

  useEffect(() => {
    if (paymentMethod !== "CASH" && cashReceivedAmount) {
      setCashReceivedAmount("")
    }
  }, [paymentMethod, cashReceivedAmount])

  useEffect(() => {
    if (zipDigits.length !== 8) {
      setAddressLookupError("")
      setAddressLookupLoading(false)
      return
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(async () => {
      setAddressLookupLoading(true)
      setAddressLookupError("")

      try {
        const addressResult = await fetch(`/api/address/${zipDigits}`, {
          cache: "no-store",
          signal: controller.signal,
        }).then(async (response) => {
          const data = (await response.json()) as AddressLookupResult | { error?: string }

          if (!response.ok || "error" in data) {
            throw new Error(("error" in data && data.error) || "CEP não encontrado.")
          }

          return data as AddressLookupResult
        })

        if (controller.signal.aborted) {
          return
        }

        setAddress((current) => ({
          ...current,
          addressZip: formatPostalCode(zipDigits),
          addressStreet: addressResult.street || current.addressStreet,
          addressNeighborhood: addressResult.neighborhood || current.addressNeighborhood,
          addressCity: addressResult.city || current.addressCity,
          addressState: addressResult.state || current.addressState,
        }))
      } catch (lookupError) {
        if (!controller.signal.aborted) {
          setAddressLookupError(lookupError instanceof Error ? lookupError.message : "CEP não encontrado.")
        }
      } finally {
        if (!controller.signal.aborted) {
          setAddressLookupLoading(false)
        }
      }
    }, 800)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [zipDigits])

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-heading mb-4">Seu carrinho está vazio</h1>
        <button onClick={() => router.push("/products")} className="text-[var(--color-primary)] hover:underline">
          Voltar para a loja
        </button>
      </div>
    )
  }

  const updateAddressField = (field: keyof CheckoutAddress, value: string) => {
    const nextValue =
      field === "addressZip"
        ? formatPostalCode(value)
        : field === "addressState"
          ? value.toUpperCase().slice(0, 2)
          : value

    setAddress((current) => ({
      ...current,
      [field]: nextValue,
    }))
  }

  const validateAddress = () => {
    if (!requiresAddress) {
      return null
    }

    const requiredFields: Array<{ key: keyof CheckoutAddress; label: string }> = [
      { key: "addressStreet", label: "rua" },
      { key: "addressNumber", label: "numero" },
      { key: "addressNeighborhood", label: "bairro" },
      { key: "addressCity", label: "cidade" },
      { key: "addressState", label: "estado" },
      { key: "addressZip", label: "CEP" },
    ]

    const missingFields = requiredFields
      .filter(({ key }) => address[key].trim().length === 0)
      .map(({ label }) => label)

    if (missingFields.length > 0) {
      return `Preencha o endereço de entrega: ${missingFields.join(", ")}.`
    }

    return null
  }

  const validateShippingSelection = () => {
    if (shippingType === "LOCAL_DELIVERY" && !localDeliveryAvailable) {
      return `A Entrega Braba está disponível somente para ${addressCity} - ${addressState}.`
    }

    return null
  }

  const validatePaymentSelection = () => {
    if (paymentMethod === "CASH") {
      const parsedCashReceivedAmount = parseMoneyInput(cashReceivedAmount)

      if (cashReceivedAmount.trim().length > 0 && parsedCashReceivedAmount == null) {
        return "Informe um valor válido para o pagamento em dinheiro."
      }

      if (parsedCashReceivedAmount != null && parsedCashReceivedAmount < estimatedTotal) {
        return "O valor em mãos não pode ser menor que o total do pedido."
      }
    }

    return null
  }

  const handleCheckout = async () => {
    setLoading(true)
    setError("")

    const addressError = validateAddress()
    if (addressError) {
      setError(addressError)
      setLoading(false)
      return
    }

    const shippingSelectionError = validateShippingSelection()
    if (shippingSelectionError) {
      setError(shippingSelectionError)
      setLoading(false)
      return
    }

    const paymentSelectionError = validatePaymentSelection()
    if (paymentSelectionError) {
      setError(paymentSelectionError)
      setLoading(false)
      return
    }

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          shippingType,
          paymentMethod,
          cashReceivedAmount:
            paymentMethod === "CASH" ? parseMoneyInput(cashReceivedAmount) : null,
          address: requiresAddress
            ? {
                ...address,
                addressZip: zipDigits,
              }
            : {},
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao processar pagamento")
      }

      if (data.initPoint) {
        window.location.href = data.initPoint
        return
      }

      if (data.redirectUrl) {
        router.push(data.redirectUrl)
        return
      }

      throw new Error("A resposta do checkout não trouxe o próximo passo esperado.")
    } catch (checkoutError: unknown) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Erro ao processar pagamento")
      setLoading(false)
    }
  }

  const estimatedTotal = getTotal() + resolvedShipping.cost
  const parsedCashReceivedAmount = parseMoneyInput(cashReceivedAmount)
  const estimatedChange =
    paymentMethod === "CASH" &&
    parsedCashReceivedAmount != null &&
    parsedCashReceivedAmount >= estimatedTotal
      ? Number((parsedCashReceivedAmount - estimatedTotal).toFixed(2))
      : null
  return (
    <div className="container mx-auto px-4 py-12 lg:py-20">
      <h1 className="text-4xl md:text-5xl font-heading tracking-wider uppercase mb-12 border-b border-white/10 pb-8">
        Finalizar <span className="text-[var(--color-primary)]">Pedido</span>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
        <div className="lg:col-span-2 space-y-8">
          <div className="glass p-8 rounded-sm border border-white/5">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 bg-[var(--color-primary)]/10 flex items-center justify-center rounded-full">
                <Box className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <h2 className="text-2xl font-heading tracking-wider uppercase">Método de Entrega</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label
                className={`border rounded-sm p-4 cursor-pointer transition-all ${
                  shippingType === "PICKUP"
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                    : "border-white/10 hover:border-white/30"
                }`}
              >
                <input
                  type="radio"
                  name="shipping"
                  value="PICKUP"
                  checked={shippingType === "PICKUP"}
                  onChange={() => setShippingType("PICKUP")}
                  className="hidden"
                />
                <div className="flex justify-between items-center mb-2 gap-3">
                  <span className="font-bold uppercase tracking-widest text-sm">Retirar na Loja</span>
                  <span className="text-[var(--color-primary)] font-bold">Grátis</span>
                </div>
                <p className="text-xs text-gray-400">Rua Antônio Lopes, 571, Aracoiaba - CE</p>
              </label>

              <label
                className={`border rounded-sm p-4 cursor-pointer transition-all ${
                  shippingType === "LOCAL_DELIVERY"
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                  : localDeliveryAvailable
                      ? "border-white/10 hover:border-white/30"
                      : "border-white/10 opacity-70 cursor-not-allowed"
                }`}
              >
                <input
                  type="radio"
                  name="shipping"
                  value="LOCAL_DELIVERY"
                  checked={shippingType === "LOCAL_DELIVERY"}
                  onChange={() => {
                    if (localDeliveryAvailable) {
                      setShippingType("LOCAL_DELIVERY")
                    }
                  }}
                  disabled={!localDeliveryAvailable}
                  className="hidden"
                />
                <div className="flex justify-between items-center mb-2 gap-3">
                  <span className="font-bold uppercase tracking-widest text-sm">Entrega Braba</span>
                  <span className={localDeliveryAvailable ? "text-[var(--color-primary)] font-bold" : "text-gray-500 font-bold"}>
                    Grátis
                  </span>
                </div>
                <p className={`text-xs ${localDeliveryAvailable ? "text-gray-400" : "text-gray-500"}`}>
                  {getLocalDeliveryHelperText({
                    hasMatchingStoreLocation,
                    isLocalDeliveryAvailable: localDeliveryAvailable,
                    addressCity,
                    addressState,
                  })}
                </p>
              </label>
            </div>
          </div>

          <div className="glass p-8 rounded-sm border border-white/5">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 bg-[var(--color-primary)]/10 flex items-center justify-center rounded-full">
                <MapPin className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-2xl font-heading tracking-wider uppercase">Endereço e CEP</h2>
                <p className="text-sm text-gray-500 mt-2">
                  Informe o CEP para preencher seu endereço automaticamente.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                value={address.addressZip}
                onChange={(event) => updateAddressField("addressZip", event.target.value)}
                className={addressInputCls}
                placeholder="CEP"
              />
              <input
                value={address.addressState}
                onChange={(event) => updateAddressField("addressState", event.target.value)}
                className={addressInputCls}
                placeholder="Estado"
                maxLength={2}
              />
              <input
                value={address.addressStreet}
                onChange={(event) => updateAddressField("addressStreet", event.target.value)}
                className={`${addressInputCls} md:col-span-2`}
                placeholder="Rua / Avenida"
              />
              <input
                value={address.addressNumber}
                onChange={(event) => updateAddressField("addressNumber", event.target.value)}
                className={addressInputCls}
                placeholder="Número"
              />
              <input
                value={address.addressComplement}
                onChange={(event) => updateAddressField("addressComplement", event.target.value)}
                className={addressInputCls}
                placeholder="Complemento"
              />
              <input
                value={address.addressNeighborhood}
                onChange={(event) => updateAddressField("addressNeighborhood", event.target.value)}
                className={addressInputCls}
                placeholder="Bairro"
              />
              <input
                value={address.addressCity}
                onChange={(event) => updateAddressField("addressCity", event.target.value)}
                className={addressInputCls}
                placeholder="Cidade"
              />
            </div>

            <div className="mt-4 space-y-2 text-sm">
              {addressLookupLoading && (
                <div className="inline-flex items-center gap-2 text-gray-400">
                  <LoaderCircle className="w-4 h-4 animate-spin" />
                  Consultando CEP...
                </div>
              )}
              {localDeliveryAvailable && (
                <p className="text-emerald-400">
                  Entrega Braba disponível para {addressCity} - {addressState}.
                </p>
              )}
              {addressLookupError && <p className="text-yellow-400">{addressLookupError}</p>}
            </div>
          </div>

          <div className="glass p-8 rounded-sm border border-white/5">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 bg-[var(--color-primary)]/10 flex items-center justify-center rounded-full">
                <CreditCard className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <h2 className="text-2xl font-heading tracking-wider uppercase">Pagamento</h2>
            </div>

            <div className="space-y-3">
              <label
                className={`block cursor-pointer rounded-sm border p-4 transition-colors ${
                  paymentMethod === "MERCADO_PAGO_CARD"
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                    : "border-white/10 hover:border-white/30"
                }`}
              >
                <input
                  type="radio"
                  name="payment-method"
                  value="MERCADO_PAGO_CARD"
                  checked={paymentMethod === "MERCADO_PAGO_CARD"}
                  onChange={() => setPaymentMethod("MERCADO_PAGO_CARD")}
                  className="hidden"
                />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-widest text-white">Cartão de Crédito</p>
                    <p className="mt-2 text-xs text-gray-400">
                      Pague com cartão de crédito via Mercado Pago. Redireciona para o ambiente seguro do Mercado Pago.
                    </p>
                  </div>
                  <CreditCard className="w-5 h-5 text-[var(--color-primary)] shrink-0" />
                </div>
              </label>

              <label
                className={`block cursor-pointer rounded-sm border p-4 transition-colors ${
                  paymentMethod === "MERCADO_PAGO_PIX"
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                    : "border-white/10 hover:border-white/30"
                }`}
              >
                <input
                  type="radio"
                  name="payment-method"
                  value="MERCADO_PAGO_PIX"
                  checked={paymentMethod === "MERCADO_PAGO_PIX"}
                  onChange={() => setPaymentMethod("MERCADO_PAGO_PIX")}
                  className="hidden"
                />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-widest text-white">Pix via Mercado Pago</p>
                    <p className="mt-2 text-xs text-gray-400">
                      Continue para o ambiente seguro do Mercado Pago e conclua o Pix por lá.
                    </p>
                  </div>
                  <CreditCard className="w-5 h-5 text-[var(--color-primary)] shrink-0" />
                </div>
              </label>

              <label
                className={`block cursor-pointer rounded-sm border p-4 transition-colors ${
                  paymentMethod === "CASH"
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                    : "border-white/10 hover:border-white/30"
                }`}
              >
                <input
                  type="radio"
                  name="payment-method"
                  value="CASH"
                  checked={paymentMethod === "CASH"}
                  onChange={() => setPaymentMethod("CASH")}
                  className="hidden"
                />
                <div className="flex items-start justify-between gap-4">
                  <div className="w-full">
                    <p className="text-sm font-bold uppercase tracking-widest text-white">Dinheiro</p>
                    <p className="mt-2 text-xs text-gray-400">
                      Registre o pedido agora e pague em dinheiro na retirada ou na entrega local.
                    </p>

                    {paymentMethod === "CASH" ? (
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-gray-500">
                            Valor em mãos
                          </label>
                          <input
                            value={cashReceivedAmount}
                            onChange={(event) => setCashReceivedAmount(event.target.value)}
                            className={addressInputCls}
                            inputMode="decimal"
                            placeholder="Ex.: 100,00"
                          />
                        </div>
                        <div className="rounded-sm border border-white/10 bg-black/20 px-4 py-3">
                          <p className="text-[11px] uppercase tracking-widest text-gray-500">Troco estimado</p>
                          <p className="mt-2 text-lg font-heading tracking-wider text-white">
                            {estimatedChange != null ? formatCurrency(estimatedChange) : "Informe o valor em mãos"}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <Banknote className="w-5 h-5 text-[var(--color-primary)] shrink-0" />
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="glass p-8 rounded-sm border border-[var(--color-primary)]/30 sticky top-24">
          <h2 className="text-2xl font-heading tracking-wider uppercase mb-6 text-[var(--color-primary)]">Resumo Final</h2>

          <div className="space-y-4 mb-6">
            {items.map((item, idx) => (
              <div key={item.lineId ?? idx} className="flex items-start justify-between gap-4 text-sm">
                <span className="min-w-0 flex-1 text-gray-400 truncate pr-4">
                  {item.quantity}x {item.productName}
                  {item.variantName && item.variantName !== "Default" ? ` · ${item.variantName}` : ""}
                  {item.selectedSize ? ` · Tam ${item.selectedSize}` : ""}
                  {item.selectedColor ? ` · ${item.selectedColor}` : ""}
                  {item.selectedFlavor ? ` · ${item.selectedFlavor}` : ""}
                </span>
                <span className="shrink-0 whitespace-nowrap text-right text-white">
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 pt-4 space-y-4 mb-8">
            <div className="flex justify-between text-gray-400">
              <span>Subtotal</span>
              <span className="text-white">{formatCurrency(getTotal())}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Entrega</span>
              <span className="text-white">{resolvedShipping.carrier ?? "Selecione uma modalidade"}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Pagamento</span>
              <span className="text-white">
                {paymentMethod === "MERCADO_PAGO_CARD"
                  ? "Cartão (Mercado Pago)"
                  : paymentMethod === "MERCADO_PAGO_PIX"
                    ? "Pix (Mercado Pago)"
                    : "Dinheiro"}
              </span>
            </div>
            <div className="flex justify-between text-gray-400 pb-4 border-b border-white/10">
              <span>Frete</span>
              <span className="text-white">{formatCurrency(resolvedShipping.cost)}</span>
            </div>
            <div className="flex justify-between items-end pt-2">
              <div>
                <span className="text-sm font-bold uppercase tracking-widest">Total Estimado</span>
                {resolvedShipping.deadline && (
                  <p className="text-xs text-gray-500 mt-2">{resolvedShipping.deadline}</p>
                )}
              </div>
              <span className="text-3xl font-heading tracking-wider text-[var(--color-primary)]">
                {formatCurrency(estimatedTotal)}
              </span>
            </div>
          </div>

          {error ? (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-sm flex items-start gap-3 mb-6">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          ) : null}

          <button
            onClick={handleCheckout}
            disabled={loading}
            className="bg-[#00B1EA] hover:bg-[#00B1EA]/90 text-white font-bold uppercase tracking-widest py-4 px-8 rounded-sm transition-all flex items-center justify-center gap-2 w-full shadow-lg shadow-[#00B1EA]/20 disabled:opacity-50"
          >
            {loading ? "Processando..." : getPaymentActionLabel(paymentMethod)}
          </button>
        </div>
      </div>
    </div>
  )
}
