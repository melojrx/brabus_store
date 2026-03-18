"use client"

import { useCartStore } from "@/store/cartStore"
import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { AlertCircle, Box, CreditCard, LoaderCircle, MapPin, Truck } from "lucide-react"

type CheckoutAddress = {
  addressStreet: string
  addressNumber: string
  addressComplement: string
  addressNeighborhood: string
  addressCity: string
  addressState: string
  addressZip: string
}

type LocalZone = {
  id: string
  city: string
  state: string
  price: number
  deadlineText: string
}

type NationalService = {
  id: string
  name: string
  carrier: string
  price: number
  deliveryTime: string
}

type AddressLookupResult = {
  cep: string
  street: string
  neighborhood: string
  city: string
  state: string
  complement: string
}

type ShippingTypeValue = "PICKUP" | "LOCAL_DELIVERY" | "NATIONAL"

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

export default function CheckoutPage() {
  const { items, getTotal } = useCartStore()
  const { status } = useSession()
  const router = useRouter()

  const [shippingType, setShippingType] = useState<ShippingTypeValue>("PICKUP")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [address, setAddress] = useState<CheckoutAddress>(initialAddress)
  const [localZones, setLocalZones] = useState<LocalZone[]>([])
  const [nationalServices, setNationalServices] = useState<NationalService[]>([])
  const [selectedNationalServiceId, setSelectedNationalServiceId] = useState("")
  const [addressLookupError, setAddressLookupError] = useState("")
  const [shippingLookupError, setShippingLookupError] = useState("")
  const [shippingLookupLoading, setShippingLookupLoading] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin?callbackUrl=/checkout")
    }
  }, [status, router])

  useEffect(() => {
    let cancelled = false

    async function loadLocalZones() {
      try {
        const response = await fetch("/api/shipping/local-zones", { cache: "no-store" })
        const data = (await response.json()) as LocalZone[] | { error?: string }

        if (!response.ok || !Array.isArray(data)) {
          return
        }

        if (!cancelled) {
          setLocalZones(
            data.map((zone) => ({
              ...zone,
              price: Number(zone.price),
            })),
          )
        }
      } catch (lookupError) {
        console.error("Erro ao carregar zonas locais:", lookupError)
      }
    }

    loadLocalZones()

    return () => {
      cancelled = true
    }
  }, [])

  const zipDigits = normalizePostalCode(address.addressZip)
  const requiresAddress = shippingType !== "PICKUP"

  const matchingLocalZone =
    address.addressCity.trim() && address.addressState.trim()
      ? localZones.find(
          (zone) =>
            normalizeLocationText(zone.city) === normalizeLocationText(address.addressCity) &&
            normalizeLocationText(zone.state) === normalizeLocationText(address.addressState || "CE"),
        ) ?? null
      : null

  const selectedNationalService =
    nationalServices.find((service) => service.id === selectedNationalServiceId) ?? null

  const resolvedShipping =
    shippingType === "PICKUP"
      ? {
          cost: 0,
          carrier: "Retirada na Loja",
          deadline: "Retirada imediata",
        }
      : shippingType === "LOCAL_DELIVERY" && matchingLocalZone
        ? {
            cost: matchingLocalZone.price,
            carrier: "Entrega Local",
            deadline: matchingLocalZone.deadlineText,
          }
        : shippingType === "NATIONAL" && selectedNationalService
          ? {
              cost: selectedNationalService.price,
              carrier: selectedNationalService.carrier,
              deadline: selectedNationalService.deliveryTime,
            }
          : {
              cost: 0,
              carrier: null,
              deadline: null,
            }

  useEffect(() => {
    if (shippingType === "LOCAL_DELIVERY" && !matchingLocalZone) {
      setShippingType("PICKUP")
    }
  }, [matchingLocalZone, shippingType])

  useEffect(() => {
    if (zipDigits.length !== 8) {
      setNationalServices([])
      setSelectedNationalServiceId("")
      setAddressLookupError("")
      setShippingLookupError("")
      setShippingLookupLoading(false)
      return
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(async () => {
      setShippingLookupLoading(true)
      setAddressLookupError("")
      setShippingLookupError("")

      const [addressResult, shippingResult] = await Promise.allSettled([
        fetch(`/api/address/${zipDigits}`, {
          cache: "no-store",
          signal: controller.signal,
        }).then(async (response) => {
          const data = (await response.json()) as
            | AddressLookupResult
            | { error?: string }

          if (!response.ok || "error" in data) {
            throw new Error(("error" in data && data.error) || "CEP não encontrado.")
          }

          return data as AddressLookupResult
        }),
        fetch("/api/shipping/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            toPostalCode: zipDigits,
            items: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          }),
        }).then(async (response) => {
          const data = (await response.json()) as
            | { services: NationalService[] }
            | { error?: string }

          if (!response.ok || !("services" in data)) {
            throw new Error(("error" in data && data.error) || "Não foi possível calcular o frete nacional.")
          }

          return data.services
        }),
      ])

      if (controller.signal.aborted) {
        return
      }

      if (addressResult.status === "fulfilled") {
        setAddress((current) => ({
          ...current,
          addressZip: formatPostalCode(zipDigits),
          addressStreet: addressResult.value.street || current.addressStreet,
          addressNeighborhood: addressResult.value.neighborhood || current.addressNeighborhood,
          addressCity: addressResult.value.city || current.addressCity,
          addressState: addressResult.value.state || current.addressState,
        }))
      } else {
        setAddressLookupError(addressResult.reason instanceof Error ? addressResult.reason.message : "CEP não encontrado.")
      }

      if (shippingResult.status === "fulfilled") {
        setNationalServices(shippingResult.value)
        setSelectedNationalServiceId((current) =>
          shippingResult.value.some((service) => service.id === current)
            ? current
            : shippingResult.value[0]?.id ?? "",
        )
      } else {
        setNationalServices([])
        setSelectedNationalServiceId("")
        setShippingLookupError(
          shippingResult.reason instanceof Error
            ? shippingResult.reason.message
            : "Não foi possível calcular o frete nacional.",
        )
      }

      setShippingLookupLoading(false)
    }, 800)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [items, zipDigits])

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

    if (shippingType === "NATIONAL" && zipDigits.length !== 8) {
      return "Informe um CEP válido para calcular o frete nacional."
    }

    return null
  }

  const validateShippingSelection = () => {
    if (shippingType === "LOCAL_DELIVERY" && !matchingLocalZone) {
      return "A cidade informada não possui entrega local disponível."
    }

    if (shippingType === "NATIONAL") {
      if (shippingLookupLoading) {
        return "Aguarde o cálculo do frete nacional."
      }

      if (nationalServices.length === 0) {
        return shippingLookupError || "Nenhuma transportadora disponível para este CEP."
      }

      if (!selectedNationalService) {
        return "Selecione uma transportadora para o envio nacional."
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

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          shippingType,
          shippingServiceId: shippingType === "NATIONAL" ? selectedNationalService?.id ?? null : null,
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

      if (data.url) {
        window.location.href = data.url
      }
    } catch (checkoutError: unknown) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Erro ao processar pagamento")
      setLoading(false)
    }
  }

  const estimatedTotal = getTotal() + resolvedShipping.cost

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
                  shippingType === "NATIONAL"
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                    : "border-white/10 hover:border-white/30"
                }`}
              >
                <input
                  type="radio"
                  name="shipping"
                  value="NATIONAL"
                  checked={shippingType === "NATIONAL"}
                  onChange={() => setShippingType("NATIONAL")}
                  className="hidden"
                />
                <div className="flex justify-between items-center mb-2 gap-3">
                  <span className="font-bold uppercase tracking-widest text-sm">Envio Nacional</span>
                  <span className="text-white font-bold">Melhor Envio</span>
                </div>
                <p className="text-xs text-gray-400">Digite o CEP para carregar PAC, SEDEX, Jadlog e outras opções.</p>
              </label>

              {matchingLocalZone && (
                <label
                  className={`border rounded-sm p-4 cursor-pointer transition-all md:col-span-2 ${
                    shippingType === "LOCAL_DELIVERY"
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                      : "border-white/10 hover:border-white/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="shipping"
                    value="LOCAL_DELIVERY"
                    checked={shippingType === "LOCAL_DELIVERY"}
                    onChange={() => setShippingType("LOCAL_DELIVERY")}
                    className="hidden"
                  />
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="font-bold uppercase tracking-widest text-sm">Entrega Local</span>
                    <span className="text-[var(--color-primary)] font-bold">{formatCurrency(matchingLocalZone.price)}</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {matchingLocalZone.city} - {matchingLocalZone.state} · {matchingLocalZone.deadlineText}
                  </p>
                </label>
              )}
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
                  Informe o CEP para carregar Melhor Envio e detectar automaticamente a entrega local por mototáxi.
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
              {shippingLookupLoading && (
                <div className="inline-flex items-center gap-2 text-gray-400">
                  <LoaderCircle className="w-4 h-4 animate-spin" />
                  Consultando CEP e opções de frete...
                </div>
              )}
              {matchingLocalZone && (
                <p className="text-emerald-400">
                  Entrega local disponível para {matchingLocalZone.city} - {matchingLocalZone.state}.
                </p>
              )}
              {addressLookupError && <p className="text-yellow-400">{addressLookupError}</p>}
              {shippingLookupError && <p className="text-yellow-400">{shippingLookupError}</p>}
              {!shippingLookupLoading && !shippingLookupError && zipDigits.length === 8 && nationalServices.length > 0 && (
                <p className="text-emerald-400">Transportadoras carregadas para o CEP informado.</p>
              )}
            </div>
          </div>

          {shippingType === "NATIONAL" && requiresAddress && (
            <div className="glass p-8 rounded-sm border border-white/5">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 bg-[var(--color-primary)]/10 flex items-center justify-center rounded-full">
                  <Truck className="w-5 h-5 text-[var(--color-primary)]" />
                </div>
                <h2 className="text-2xl font-heading tracking-wider uppercase">Transportadoras</h2>
              </div>

              {zipDigits.length !== 8 ? (
                <p className="text-sm text-gray-400">Informe um CEP válido para carregar as opções do Melhor Envio.</p>
              ) : shippingLookupLoading ? (
                <div className="inline-flex items-center gap-2 text-gray-400 text-sm">
                  <LoaderCircle className="w-4 h-4 animate-spin" />
                  Calculando opções de frete...
                </div>
              ) : nationalServices.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhuma transportadora disponível para este CEP no momento.</p>
              ) : (
                <div className="space-y-3">
                  {nationalServices.map((service) => (
                    <label
                      key={service.id}
                      className={`flex cursor-pointer items-center justify-between gap-4 rounded-sm border p-4 transition-colors ${
                        selectedNationalServiceId === service.id
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                          : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      <input
                        type="radio"
                        name="national-service"
                        value={service.id}
                        checked={selectedNationalServiceId === service.id}
                        onChange={() => setSelectedNationalServiceId(service.id)}
                        className="hidden"
                      />
                      <div>
                        <p className="text-sm font-bold uppercase tracking-widest text-white">{service.name}</p>
                        <p className="text-xs text-gray-400">
                          {service.carrier} · {service.deliveryTime}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-[var(--color-primary)]">{formatCurrency(service.price)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="glass p-8 rounded-sm border border-white/5">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 bg-[var(--color-primary)]/10 flex items-center justify-center rounded-full">
                <CreditCard className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <h2 className="text-2xl font-heading tracking-wider uppercase">Pagamento</h2>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Você será redirecionado para o ambiente seguro do Stripe para finalizar o pagamento via PIX, Boleto ou Cartão de Crédito.
            </p>
          </div>
        </div>

        <div className="glass p-8 rounded-sm border border-[var(--color-primary)]/30 sticky top-24">
          <h2 className="text-2xl font-heading tracking-wider uppercase mb-6 text-[var(--color-primary)]">Resumo Final</h2>

          <div className="space-y-4 mb-6">
            {items.map((item, idx) => (
              <div key={item.lineId ?? idx} className="flex justify-between gap-4 text-sm">
                <span className="text-gray-400 truncate pr-4">
                  {item.quantity}x {item.productName}
                  {item.variantName && item.variantName !== "Default" ? ` · ${item.variantName}` : ""}
                  {item.selectedSize ? ` · Tam ${item.selectedSize}` : ""}
                  {item.selectedColor ? ` · ${item.selectedColor}` : ""}
                  {item.selectedFlavor ? ` · ${item.selectedFlavor}` : ""}
                </span>
                <span className="text-white">{formatCurrency(item.price * item.quantity)}</span>
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

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-sm flex items-start gap-3 mb-6">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={loading}
            className="bg-[#635BFF] hover:bg-[#635BFF]/90 text-white font-bold uppercase tracking-widest py-4 px-8 rounded-sm transition-all flex items-center justify-center gap-2 w-full shadow-lg shadow-[#635BFF]/20 disabled:opacity-50"
          >
            {loading ? "Processando..." : "Pagar com Stripe"}
          </button>
        </div>
      </div>
    </div>
  )
}
