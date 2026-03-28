"use client"

import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  ChevronDown,
  LayoutGrid,
  Loader2,
  MapPin,
  Minus,
  Plus,
  Rows3,
  Search,
  ShoppingBasket,
  Trash2,
  Truck,
  UserRound,
  WalletCards,
} from "lucide-react"
import {
  formatChangeAmount,
  formatCurrencyInputValue,
  maskPhoneInput,
  maskPostalCodeInput,
  maskCurrencyInput,
  parseCurrencyInputValue,
} from "@/lib/currency-input"
import { getPaymentMethodLabel } from "@/lib/payment-status"

type Feedback =
  | {
      type: "success" | "error"
      message: string
    }
  | null

type PdvProduct = {
  id: string
  name: string
  slug: string
  price: number
  image: string | null
  categoryName: string
  subcategoryName: string | null
  variants: Array<{
    id: string
    label: string
    size: string | null
    color: string | null
    flavor: string | null
    stock: number
  }>
}

type PdvProductsResponse = {
  items: PdvProduct[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

type PdvCustomer = {
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
}

type CartItem = {
  productId: string
  productName: string
  image: string | null
  productPrice: number
  variantId: string
  variantLabel: string
  stock: number
  quantity: number
}

type LocalZone = {
  id: string
  city: string
  state: string
  price: number
  deadlineText: string
}

type ShippingService = {
  id: string
  name: string
  carrier: string
  price: number
  deliveryTime: string
}

type AddressState = {
  addressStreet: string
  addressNumber: string
  addressComplement: string
  addressNeighborhood: string
  addressCity: string
  addressState: string
  addressZip: string
}

const EMPTY_ADDRESS: AddressState = {
  addressStreet: "",
  addressNumber: "",
  addressComplement: "",
  addressNeighborhood: "",
  addressCity: "",
  addressState: "",
  addressZip: "",
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

function normalizeLocationValue(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
}

async function parseErrorMessage(response: Response) {
  try {
    const payload = await response.json()

    if (typeof payload?.error === "string") {
      return payload.error
    }
  } catch {
    return null
  }

  return null
}

export default function PdvManager({ pixKey }: { pixKey: string | null }) {
  const router = useRouter()
  const customerSearchRef = useRef<HTMLDivElement | null>(null)
  const [productSearch, setProductSearch] = useState("")
  const [productPage, setProductPage] = useState(1)
  const [productViewMode, setProductViewMode] = useState<"cards" | "table">("table")
  const [customerSearch, setCustomerSearch] = useState("")
  const [customerSectionOpen, setCustomerSectionOpen] = useState(false)
  const [products, setProducts] = useState<PdvProduct[]>([])
  const [productPagination, setProductPagination] = useState({
    page: 1,
    pageSize: 24,
    totalItems: 0,
    totalPages: 1,
  })
  const [customers, setCustomers] = useState<PdvCustomer[]>([])
  const [localZones, setLocalZones] = useState<LocalZone[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<PdvCustomer | null>(null)
  const [walkInCustomerName, setWalkInCustomerName] = useState("")
  const [walkInCustomerEmail, setWalkInCustomerEmail] = useState("")
  const [walkInCustomerPhone, setWalkInCustomerPhone] = useState("")
  const [address, setAddress] = useState<AddressState>(EMPTY_ADDRESS)
  const [items, setItems] = useState<CartItem[]>([])
  const [shippingType, setShippingType] = useState<"PICKUP" | "LOCAL_DELIVERY" | "NATIONAL">("PICKUP")
  const [shippingServices, setShippingServices] = useState<ShippingService[]>([])
  const [selectedShippingServiceId, setSelectedShippingServiceId] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "MANUAL_PIX" | "POS_DEBIT" | "POS_CREDIT">("CASH")
  const [paymentStatus, setPaymentStatus] = useState<"PENDING" | "PAID">("PAID")
  const [paymentInstallments, setPaymentInstallments] = useState("1")
  const [manualPaymentReference, setManualPaymentReference] = useState("")
  const [manualPaymentNotes, setManualPaymentNotes] = useState("")
  const [cashReceivedAmount, setCashReceivedAmount] = useState("")
  const [productsFeedback, setProductsFeedback] = useState<Feedback>(null)
  const [shippingFeedback, setShippingFeedback] = useState<Feedback>(null)
  const [currentOrderFeedback, setCurrentOrderFeedback] = useState<Feedback>(null)
  const [checkoutFeedback, setCheckoutFeedback] = useState<Feedback>(null)
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false)
  const [isLoadingLocalZones, setIsLoadingLocalZones] = useState(false)
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false)
  const [isSubmitting, startSubmitTransition] = useTransition()
  const deferredProductSearch = useDeferredValue(productSearch)
  const deferredCustomerSearch = useDeferredValue(customerSearch)

  useEffect(() => {
    const controller = new AbortController()

    async function loadProducts() {
      setIsLoadingProducts(true)

      try {
        const searchParams = new URLSearchParams()

        if (deferredProductSearch.trim()) {
          searchParams.set("q", deferredProductSearch)
        }

        searchParams.set("page", String(productPage))

        const response = await fetch(`/api/admin/pdv/products?${searchParams.toString()}`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error("Não foi possível carregar os produtos do PDV.")
        }

        const payload = (await response.json()) as PdvProductsResponse
        setProducts(payload.items)
        setProductPagination(payload.pagination)
        setProductsFeedback(null)
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setProducts([])
          setProductPagination((current) => ({
            ...current,
            totalItems: 0,
            totalPages: 1,
          }))
          setProductsFeedback({
            type: "error",
            message: "Falha ao carregar produtos para o PDV.",
          })
        }
      } finally {
        setIsLoadingProducts(false)
      }
    }

    void loadProducts()

    return () => controller.abort()
  }, [deferredProductSearch, productPage])

  useEffect(() => {
    setProductPage(1)
  }, [deferredProductSearch])

  useEffect(() => {
    const controller = new AbortController()

    async function loadCustomers() {
      setIsLoadingCustomers(true)

      try {
        const response = await fetch(`/api/admin/pdv/customers?q=${encodeURIComponent(deferredCustomerSearch)}`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error("Não foi possível carregar os clientes.")
        }

        const payload = (await response.json()) as PdvCustomer[]
        setCustomers(payload)
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setCustomers([])
        }
      } finally {
        setIsLoadingCustomers(false)
      }
    }

    void loadCustomers()

    return () => controller.abort()
  }, [deferredCustomerSearch])

  useEffect(() => {
    const controller = new AbortController()

    async function loadLocalZones() {
      setIsLoadingLocalZones(true)

      try {
        const response = await fetch("/api/shipping/local-zones", {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error("Falha ao carregar zonas locais.")
        }

        const payload = (await response.json()) as LocalZone[]
        setLocalZones(payload)
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setLocalZones([])
        }
      } finally {
        setIsLoadingLocalZones(false)
      }
    }

    void loadLocalZones()

    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (shippingType !== "NATIONAL") {
      setShippingServices([])
      setSelectedShippingServiceId("")
      setIsCalculatingShipping(false)
      setShippingFeedback(null)
    }
  }, [shippingType])

  useEffect(() => {
    if (shippingType === "NATIONAL") {
      setSelectedShippingServiceId("")
    }
  }, [items, address.addressZip, shippingType])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!customerSearchRef.current?.contains(event.target as Node)) {
        setCustomerSearch("")
      }
    }

    document.addEventListener("mousedown", handlePointerDown)

    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
    }
  }, [])

  const selectedLocalZone = useMemo(() => {
    if (shippingType !== "LOCAL_DELIVERY") {
      return null
    }

    return (
      localZones.find(
        (zone) =>
          normalizeLocationValue(zone.city) === normalizeLocationValue(address.addressCity) &&
          normalizeLocationValue(zone.state) === normalizeLocationValue(address.addressState || "CE"),
      ) ?? null
    )
  }, [address.addressCity, address.addressState, localZones, shippingType])

  const selectedShippingService = useMemo(
    () => shippingServices.find((service) => service.id === selectedShippingServiceId) ?? null,
    [selectedShippingServiceId, shippingServices],
  )

  const shippingCost = useMemo(() => {
    if (shippingType === "PICKUP") {
      return 0
    }

    if (shippingType === "LOCAL_DELIVERY") {
      return selectedLocalZone?.price ?? 0
    }

    return selectedShippingService?.price ?? 0
  }, [selectedLocalZone, selectedShippingService, shippingType])

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.productPrice * item.quantity, 0),
    [items],
  )
  const total = subtotal + shippingCost
  const parsedCashReceivedAmount = parseCurrencyInputValue(cashReceivedAmount)
  const computedChangeAmount = formatChangeAmount(total, parsedCashReceivedAmount)
  const isCashPayment = paymentMethod === "CASH"
  const isManualPixPayment = paymentMethod === "MANUAL_PIX"
  const isCardTerminalPayment = paymentMethod === "POS_DEBIT" || paymentMethod === "POS_CREDIT"
  const shouldShowReference = isManualPixPayment || isCardTerminalPayment
  const shouldShowCustomerResults = customerSearch.trim().length >= 2
  const hasManualCustomerInfo = Boolean(
    walkInCustomerName.trim() || walkInCustomerEmail.trim() || walkInCustomerPhone.trim(),
  )
  const isDeliveryReady =
    shippingType === "PICKUP" ||
    (shippingType === "LOCAL_DELIVERY" && selectedLocalZone !== null) ||
    (shippingType === "NATIONAL" && selectedShippingService !== null)
  const canSubmitOrder = items.length > 0 && isDeliveryReady
  const selectedVariantQuantityMap = useMemo(
    () => new Map(items.map((item) => [item.variantId, item.quantity])),
    [items],
  )

  function shouldAlertNegativeStock(stock: number, quantity: number) {
    return quantity > stock
  }

  function handleAddVariant(product: PdvProduct, variant: PdvProduct["variants"][number]) {
    setProductsFeedback(null)

    setItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.variantId === variant.id)

      if (existingItem) {
        const nextQuantity = existingItem.quantity + 1

        if (shouldAlertNegativeStock(variant.stock, nextQuantity)) {
          setProductsFeedback({
            type: "error",
            message: `O estoque disponível de ${product.name} já foi atingido no pedido atual.`,
          })
        }

        return currentItems.map((item) =>
          item.variantId === variant.id
            ? {
                ...item,
                quantity: nextQuantity,
              }
            : item,
        )
      }

      if (shouldAlertNegativeStock(variant.stock, 1)) {
        setProductsFeedback({
          type: "error",
          message: `O estoque disponível de ${product.name} já foi atingido no pedido atual.`,
        })
      }

      return [
        ...currentItems,
        {
          productId: product.id,
          productName: product.name,
          image: product.image,
          productPrice: product.price,
          variantId: variant.id,
          variantLabel: variant.label,
          stock: variant.stock,
          quantity: 1,
        },
      ]
    })
  }

  function handleAddProduct(product: PdvProduct) {
    const firstAvailableVariant = product.variants.find((variant) => variant.stock > 0) ?? product.variants[0]

    if (!firstAvailableVariant) {
      setProductsFeedback({
        type: "error",
        message: `Nenhuma variante disponível para ${product.name}.`,
      })
      return
    }

    handleAddVariant(product, firstAvailableVariant)
  }

  function handleQuantityChange(variantId: string, nextQuantity: number) {
    setCurrentOrderFeedback(null)

    setItems((currentItems) => {
      if (nextQuantity <= 0) {
        return currentItems.filter((item) => item.variantId !== variantId)
      }

      return currentItems.map((item) => {
        if (item.variantId !== variantId) {
          return item
        }

        if (shouldAlertNegativeStock(item.stock, nextQuantity)) {
          setCurrentOrderFeedback({
            type: "error",
            message: `A quantidade de ${item.productName} não pode ultrapassar o estoque disponível.`,
          })
        }

        return {
          ...item,
          quantity: nextQuantity,
        }
      })
    })
  }

  function handleAddressChange(field: keyof AddressState, value: string) {
    setAddress((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function handleSelectCustomer(customer: PdvCustomer) {
    setSelectedCustomer(customer)
    setCustomerSectionOpen(true)
    setCustomerSearch("")
    setWalkInCustomerName("")
    setWalkInCustomerEmail("")
    setWalkInCustomerPhone("")
    setAddress({
      addressStreet: customer.addressStreet ?? "",
      addressNumber: customer.addressNumber ?? "",
      addressComplement: customer.addressComplement ?? "",
      addressNeighborhood: customer.addressNeighborhood ?? "",
      addressCity: customer.addressCity ?? "",
      addressState: customer.addressState ?? "",
      addressZip: customer.addressZip ?? "",
    })
  }

  function handleClearCustomerInfo() {
    setSelectedCustomer(null)
    setCustomerSearch("")
    setWalkInCustomerName("")
    setWalkInCustomerEmail("")
    setWalkInCustomerPhone("")
  }

  function resetForm() {
    setSelectedCustomer(null)
    setCustomerSearch("")
    setCustomerSectionOpen(false)
    setWalkInCustomerName("")
    setWalkInCustomerEmail("")
    setWalkInCustomerPhone("")
    setAddress(EMPTY_ADDRESS)
    setItems([])
    setShippingType("PICKUP")
    setShippingServices([])
    setSelectedShippingServiceId("")
    setPaymentMethod("CASH")
    setPaymentStatus("PAID")
    setPaymentInstallments("1")
    setManualPaymentReference("")
    setManualPaymentNotes("")
    setCashReceivedAmount("")
    setCurrentOrderFeedback(null)
    setCheckoutFeedback(null)
    setShippingFeedback(null)
  }

  async function handleCalculateNationalShipping() {
    setShippingFeedback(null)

    if (items.length === 0) {
      setShippingFeedback({
        type: "error",
        message: "Adicione itens ao pedido antes de calcular o frete nacional.",
      })
      return
    }

    if (!address.addressZip.trim()) {
      setShippingFeedback({
        type: "error",
        message: "Informe o CEP de entrega para calcular o frete nacional.",
      })
      return
    }

    setIsCalculatingShipping(true)

    try {
      const response = await fetch("/api/shipping/calculate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          toPostalCode: address.addressZip,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        }),
      })

      if (!response.ok) {
        const message = await parseErrorMessage(response)
        setShippingFeedback({
          type: "error",
          message: message ?? "Não foi possível calcular o frete nacional.",
        })
        setShippingServices([])
        return
      }

      const payload = (await response.json()) as { services: ShippingService[] }
      setShippingServices(payload.services)
      setSelectedShippingServiceId(payload.services[0]?.id ?? "")
      setShippingFeedback({
        type: "success",
        message: payload.services.length > 0
          ? "Frete calculado. Escolha o serviço desejado."
          : "Nenhum serviço disponível para o CEP informado.",
      })
    } catch {
      setShippingFeedback({
        type: "error",
        message: "Erro de conexão ao calcular o frete nacional.",
      })
      setShippingServices([])
    } finally {
      setIsCalculatingShipping(false)
    }
  }

  function handleSubmit() {
    startSubmitTransition(async () => {
      setCheckoutFeedback(null)

      try {
        const response = await fetch("/api/admin/pdv/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customerId: selectedCustomer?.id ?? null,
            customerName: selectedCustomer ? null : walkInCustomerName.trim() || null,
            customerEmail: selectedCustomer ? null : walkInCustomerEmail.trim() || null,
            customerPhone: selectedCustomer ? null : walkInCustomerPhone.trim() || null,
            items: items.map((item) => ({
              productId: item.productId,
              productVariantId: item.variantId,
              quantity: item.quantity,
            })),
            shippingType,
            shippingServiceId: shippingType === "NATIONAL" ? selectedShippingServiceId || null : null,
            address,
            paymentMethod,
            paymentStatus,
            paymentInstallments: paymentMethod === "POS_CREDIT" ? paymentInstallments : null,
            manualPaymentReference: shouldShowReference ? manualPaymentReference.trim() : null,
            manualPaymentNotes: manualPaymentNotes.trim() || null,
            cashReceivedAmount: isCashPayment && parsedCashReceivedAmount != null ? parsedCashReceivedAmount.toFixed(2) : null,
            changeAmount: null,
          }),
        })

        if (!response.ok) {
          const message = await parseErrorMessage(response)
          setCheckoutFeedback({
            type: "error",
            message: message ?? "Não foi possível concluir a venda no PDV.",
          })
          return
        }

        const payload = (await response.json()) as { id: string }
        resetForm()
        router.push(`/admin/orders/${payload.id}`)
        router.refresh()
      } catch {
        setCheckoutFeedback({
          type: "error",
          message: "Erro de conexão ao concluir a venda presencial.",
        })
      }
    })
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 border-b border-white/5 pb-8 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-gray-500">Operação Presencial</p>
          <h1 className="mt-3 text-3xl font-heading uppercase tracking-wider text-white md:text-5xl">
            PDV <span className="text-[var(--color-primary)]">Balcão</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-gray-400">
            Monte pedidos presenciais, escolha os produtos primeiro e finalize com entrega e pagamento sem depender do Stripe. Cliente é opcional.
          </p>
        </div>

        <div className="rounded-sm border border-white/10 bg-zinc-950 px-5 py-4">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Total Atual</p>
          <p className="mt-2 text-2xl font-heading tracking-wider text-white">{formatCurrency(total)}</p>
          <p className="text-xs text-gray-500">{items.length} item(ns) no pedido</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <section className="rounded-sm border border-white/5 bg-zinc-900 p-6 xl:flex xl:h-[calc(100vh-8rem)] xl:flex-col">
            <div className="flex items-center gap-3">
              <ShoppingBasket className="h-5 w-5 text-[var(--color-primary)]" />
              <div>
                <h2 className="font-heading text-sm uppercase tracking-wider text-white">Produtos</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Selecione os produtos do pedido primeiro. As variantes são adicionadas direto ao resumo da venda.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4 xl:flex xl:min-h-0 xl:flex-1 xl:flex-col xl:space-y-0 xl:gap-4">
              <div>
                <label className="label-admin">Buscar Produto</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <input
                    value={productSearch}
                    onChange={(event) => {
                      setProductSearch(event.target.value)
                    }}
                    className="input-admin !pl-12"
                    placeholder="Nome ou slug do produto"
                  />
                </div>
              </div>

              {productsFeedback && (
                <p
                  className={`rounded-sm border px-4 py-3 text-sm ${
                    productsFeedback.type === "success"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-red-500/30 bg-red-500/10 text-red-300"
                  }`}
                >
                  {productsFeedback.message}
                </p>
              )}

              <div className="xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:overscroll-contain xl:pr-2">
                {isLoadingProducts ? (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando catálogo do PDV...
                  </div>
                ) : products.length === 0 ? (
                  <p className="text-sm text-gray-500">Nenhum produto disponível para o termo informado.</p>
                ) : (
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.2em] text-gray-500">
                        <span>{productPagination.totalItems} produto(s) encontrados</span>
                        <span>
                          Página {productPagination.page} de {productPagination.totalPages}
                        </span>
                      </div>

                      <div className="inline-flex rounded-sm border border-white/10 bg-black/20 p-1">
                        <button
                          type="button"
                          onClick={() => setProductViewMode("cards")}
                          className={`inline-flex items-center gap-2 rounded-sm px-3 py-2 text-[11px] font-bold uppercase tracking-[0.2em] transition-colors ${
                            productViewMode === "cards"
                              ? "bg-[var(--color-primary)] text-black"
                              : "text-gray-300 hover:text-white"
                          }`}
                        >
                          <LayoutGrid className="h-3.5 w-3.5" />
                          Cards
                        </button>
                        <button
                          type="button"
                          onClick={() => setProductViewMode("table")}
                          className={`inline-flex items-center gap-2 rounded-sm px-3 py-2 text-[11px] font-bold uppercase tracking-[0.2em] transition-colors ${
                            productViewMode === "table"
                              ? "bg-[var(--color-primary)] text-black"
                              : "text-gray-300 hover:text-white"
                          }`}
                        >
                          <Rows3 className="h-3.5 w-3.5" />
                          Tabela
                        </button>
                      </div>
                    </div>

                    {productViewMode === "cards" ? (
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                        {products.map((product) => (
                          <article
                            key={product.id}
                            className={`rounded-sm border p-3 transition-colors ${
                              product.variants.some((variant) => selectedVariantQuantityMap.has(variant.id))
                                ? "border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5"
                                : "border-white/5 bg-black/20"
                            }`}
                          >
                            <div className="relative overflow-hidden rounded-sm bg-white/5">
                              {product.variants.some((variant) => selectedVariantQuantityMap.has(variant.id)) && (
                                <span className="absolute right-2 top-2 z-10 rounded-sm bg-[var(--color-primary)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-black">
                                  No pedido
                                </span>
                              )}

                              <div className="aspect-square w-full">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={product.image || "/placeholder.jpg"}
                                  alt={product.name}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            </div>

                            <div className="mt-3 min-w-0">
                              <div className="flex items-start justify-between gap-3">
                                <button
                                  type="button"
                                  onClick={() => handleAddProduct(product)}
                                  className="line-clamp-2 text-left text-sm font-medium text-white transition-colors hover:text-[var(--color-primary)]"
                                >
                                  {product.name}
                                </button>
                                <p className="shrink-0 text-sm font-semibold text-white">{formatCurrency(product.price)}</p>
                              </div>
                              <p className="mt-1 line-clamp-2 text-[11px] text-gray-500">
                                {product.categoryName}
                                {product.subcategoryName ? ` / ${product.subcategoryName}` : ""}
                              </p>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              {product.variants.map((variant) => {
                                const selectedQuantity = selectedVariantQuantityMap.get(variant.id) ?? 0

                                return (
                                  <button
                                    key={variant.id}
                                    type="button"
                                    onClick={() => handleAddVariant(product, variant)}
                                    className={`min-w-0 rounded-sm border px-3 py-2 text-left text-xs transition-colors ${
                                      selectedQuantity > 0
                                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-white"
                                        : "border-white/10 text-gray-300 hover:border-[var(--color-primary)] hover:text-white"
                                    }`}
                                  >
                                    <span className="block truncate font-medium text-white">{variant.label}</span>
                                    <span className="mt-1 block text-[10px] uppercase tracking-[0.2em] text-gray-500">
                                      Estoque: {variant.stock}
                                    </span>
                                    {selectedQuantity > 0 && (
                                      <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]">
                                        Selecionado: {selectedQuantity}
                                      </span>
                                    )}
                                  </button>
                                )
                              })}
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-sm border border-white/5">
                        <table className="min-w-full divide-y divide-white/5 text-sm">
                          <thead className="bg-black/30">
                            <tr className="text-left text-[11px] uppercase tracking-[0.2em] text-gray-500">
                              <th className="px-4 py-3 font-medium">Produto</th>
                              <th className="px-4 py-3 font-medium">Categoria</th>
                              <th className="px-4 py-3 font-medium">Variantes</th>
                              <th className="px-4 py-3 font-medium">Preço</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 bg-zinc-950/30">
                            {products.map((product) => (
                              <tr
                                key={product.id}
                                className={`align-top transition-colors ${
                                  product.variants.some((variant) => selectedVariantQuantityMap.has(variant.id))
                                    ? "bg-[var(--color-primary)]/5"
                                    : ""
                                }`}
                              >
                                <td className="px-4 py-4">
                                  <div className="flex min-w-[240px] items-start gap-3">
                                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-sm bg-white/5">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={product.image || "/placeholder.jpg"}
                                        alt={product.name}
                                        className="h-full w-full object-cover"
                                      />
                                    </div>
                                    <div className="min-w-0">
                                      <button
                                        type="button"
                                        onClick={() => handleAddProduct(product)}
                                        className="text-left text-sm font-medium text-white transition-colors hover:text-[var(--color-primary)]"
                                      >
                                        {product.name}
                                      </button>
                                      <p className="mt-1 text-xs text-gray-500">{product.slug}</p>
                                      {product.variants.some((variant) => selectedVariantQuantityMap.has(variant.id)) ? (
                                        <span className="mt-2 inline-flex rounded-sm bg-[var(--color-primary)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-black">
                                          No pedido
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-gray-300">
                                  <div className="min-w-[180px]">
                                    {product.categoryName}
                                    {product.subcategoryName ? ` / ${product.subcategoryName}` : ""}
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="flex min-w-[340px] flex-wrap gap-2">
                                    {product.variants.map((variant) => {
                                      const selectedQuantity = selectedVariantQuantityMap.get(variant.id) ?? 0

                                      return (
                                        <button
                                          key={variant.id}
                                          type="button"
                                          onClick={() => handleAddVariant(product, variant)}
                                          className={`min-w-[180px] flex-1 rounded-sm border px-3 py-2 text-left text-xs transition-colors ${
                                            selectedQuantity > 0
                                              ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-white"
                                              : "border-white/10 text-gray-300 hover:border-[var(--color-primary)] hover:text-white"
                                          }`}
                                        >
                                          <span className="block truncate font-medium text-white">{variant.label}</span>
                                          <span className="mt-1 block text-[10px] uppercase tracking-[0.2em] text-gray-500">
                                            Estoque: {variant.stock}
                                          </span>
                                          {selectedQuantity > 0 ? (
                                            <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]">
                                              Selecionado: {selectedQuantity}
                                            </span>
                                          ) : null}
                                        </button>
                                      )
                                    })}
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <span className="whitespace-nowrap font-semibold text-white">
                                    {formatCurrency(product.price)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {productPagination.totalPages > 1 && (
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setProductPage((current) => Math.max(1, current - 1))}
                          disabled={productPagination.page <= 1}
                          className="rounded-sm border border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-gray-300 transition-colors hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Anterior
                        </button>

                        <div className="flex flex-wrap gap-2">
                          {Array.from({ length: productPagination.totalPages }, (_, index) => index + 1)
                            .slice(
                              Math.max(0, productPagination.page - 3),
                              Math.max(0, productPagination.page - 3) + 5,
                            )
                            .map((page) => (
                              <button
                                key={page}
                                type="button"
                                onClick={() => setProductPage(page)}
                                className={`rounded-sm px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] transition-colors ${
                                  page === productPagination.page
                                    ? "bg-[var(--color-primary)] text-black"
                                    : "border border-white/10 text-gray-300 hover:border-white/30 hover:text-white"
                                }`}
                              >
                                {page}
                              </button>
                            ))}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setProductPage((current) => Math.min(productPagination.totalPages, current + 1))
                          }
                          disabled={productPagination.page >= productPagination.totalPages}
                          className="rounded-sm border border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-gray-300 transition-colors hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Próxima
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <section className="rounded-sm border border-white/5 bg-zinc-900 p-6">
            <button
              type="button"
              onClick={() => setCustomerSectionOpen((current) => !current)}
              className="flex w-full items-center justify-between gap-4 text-left"
            >
              <div className="flex items-center gap-3">
                <UserRound className="h-5 w-5 text-[var(--color-primary)]" />
                <div>
                  <h2 className="font-heading text-sm uppercase tracking-wider text-white">Incluir Cliente</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Opcional. Você pode vincular um cliente cadastrado ou preencher os dados manualmente.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="hidden text-xs uppercase tracking-[0.2em] text-gray-500 sm:inline">
                  {selectedCustomer
                    ? selectedCustomer.name
                    : hasManualCustomerInfo
                      ? walkInCustomerName.trim() || "Cliente manual"
                      : "Sem cliente"}
                </span>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${customerSectionOpen ? "rotate-180" : ""}`} />
              </div>
            </button>

            {customerSectionOpen ? (
              <div className="mt-6 space-y-4 border-t border-white/5 pt-6">
                <div>
                  <label className="label-admin">Buscar Cliente Cadastrado</label>
                  <div ref={customerSearchRef} className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <input
                      value={customerSearch}
                      onChange={(event) => setCustomerSearch(event.target.value)}
                      className="input-admin !pl-12"
                      placeholder="Nome, e-mail ou telefone"
                    />

                    {shouldShowCustomerResults ? (
                      <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-72 overflow-y-auto rounded-sm border border-white/10 bg-zinc-950 shadow-2xl">
                        {isLoadingCustomers ? (
                          <div className="flex items-center gap-2 px-4 py-4 text-sm text-gray-400">
                            <Loader2 className="h-4 w-4 animate-spin" /> Carregando clientes...
                          </div>
                        ) : customers.length === 0 ? (
                          <p className="px-4 py-4 text-sm text-gray-500">Nenhum cliente encontrado.</p>
                        ) : (
                          customers.map((customer) => (
                            <button
                              key={customer.id}
                              type="button"
                              onClick={() => handleSelectCustomer(customer)}
                              className="flex w-full items-center justify-between border-b border-white/5 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-white/5"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-white">{customer.name}</p>
                                <p className="truncate text-xs text-gray-500">{customer.email}</p>
                              </div>
                              <span className="ml-4 shrink-0 text-xs uppercase tracking-[0.2em] text-gray-500">
                                {customer.phone ?? "Sem telefone"}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>

                {selectedCustomer ? (
                  <div className="rounded-sm border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 px-4 py-4 text-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-white">{selectedCustomer.name}</p>
                        <p className="mt-1 text-gray-300">{selectedCustomer.email}</p>
                        {selectedCustomer.phone ? <p className="text-gray-400">{selectedCustomer.phone}</p> : null}
                      </div>

                      <button
                        type="button"
                        onClick={handleClearCustomerInfo}
                        className="rounded-sm border border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-300 transition-colors hover:border-white/30 hover:text-white"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="label-admin">Nome do Cliente</label>
                    <input
                      value={walkInCustomerName}
                      onChange={(event) => setWalkInCustomerName(event.target.value)}
                      className="input-admin"
                      placeholder="Ex.: Maria da Silva"
                    />
                  </div>

                  <div>
                    <label className="label-admin">Telefone / WhatsApp</label>
                    <input
                      value={walkInCustomerPhone}
                      onChange={(event) => setWalkInCustomerPhone(maskPhoneInput(event.target.value))}
                      className="input-admin"
                      placeholder="Ex.: (85) 99999-9999"
                      inputMode="numeric"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="label-admin">E-mail</label>
                    <input
                      value={walkInCustomerEmail}
                      onChange={(event) => setWalkInCustomerEmail(event.target.value)}
                      className="input-admin"
                      placeholder="Opcional, para identificação da venda"
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          <section className="rounded-sm border border-white/5 bg-zinc-900 p-6">
            <h2 className="font-heading text-sm uppercase tracking-wider text-white">Pedido Atual</h2>
            <p className="mt-2 text-sm text-gray-500">
              Revise itens, total e contexto do pedido antes de seguir para pagamento e entrega.
            </p>

            <div className="mt-6 space-y-4">
              {currentOrderFeedback ? (
                <p
                  className={`rounded-sm border px-4 py-3 text-sm ${
                    currentOrderFeedback.type === "success"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-red-500/30 bg-red-500/10 text-red-300"
                  }`}
                >
                  {currentOrderFeedback.message}
                </p>
              ) : null}

              {items.length === 0 ? (
                <div className="rounded-sm border border-dashed border-white/10 px-4 py-12 text-center text-sm text-gray-500">
                  Adicione produtos para começar a venda presencial.
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.variantId} className="rounded-sm border border-white/5 bg-black/20 px-4 py-4">
                    <div className="flex items-start gap-4">
                      <div className="h-16 w-16 overflow-hidden rounded-sm bg-white/5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.image || "/placeholder.jpg"}
                          alt={item.productName}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white">{item.productName}</p>
                        <p className="mt-1 text-xs text-gray-500">{item.variantLabel}</p>
                        <p className="mt-2 text-xs text-gray-500">
                          {formatCurrency(item.productPrice)} por unidade • Estoque disponível: {item.stock}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleQuantityChange(item.variantId, 0)}
                        className="rounded-sm border border-white/10 p-2 text-gray-400 transition-colors hover:border-red-500/40 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-4">
                      <div className="inline-flex items-center rounded-sm border border-white/10">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item.variantId, item.quantity - 1)}
                          className="px-3 py-2 text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="min-w-[44px] text-center text-sm font-medium text-white">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item.variantId, item.quantity + 1)}
                          className="px-3 py-2 text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      <p className="text-sm font-semibold text-white">
                        {formatCurrency(item.productPrice * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))
              )}

              {selectedCustomer || hasManualCustomerInfo ? (
                <div className="rounded-sm border border-white/5 bg-black/30 px-4 py-4">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Cliente no pedido</p>
                  {selectedCustomer ? (
                    <>
                      <p className="mt-2 text-sm font-medium text-white">{selectedCustomer.name}</p>
                      <p className="mt-1 text-sm text-gray-400">{selectedCustomer.email}</p>
                      {selectedCustomer.phone ? <p className="text-xs text-gray-500">{selectedCustomer.phone}</p> : null}
                    </>
                  ) : (
                    <>
                      <p className="mt-2 text-sm font-medium text-white">{walkInCustomerName.trim() || "Cliente manual"}</p>
                      {walkInCustomerEmail.trim() ? <p className="mt-1 text-sm text-gray-400">{walkInCustomerEmail.trim()}</p> : null}
                      {walkInCustomerPhone.trim() ? <p className="text-xs text-gray-500">{walkInCustomerPhone.trim()}</p> : null}
                    </>
                  )}
                </div>
              ) : null}

              <div className="rounded-sm border border-white/5 bg-black/30 px-4 py-4">
                <div className="flex items-center justify-between text-sm text-gray-400">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm text-gray-400">
                  <span>Entrega</span>
                  <span>
                    {shippingType === "PICKUP"
                      ? "Retirada em loja"
                      : shippingType === "LOCAL_DELIVERY"
                        ? selectedLocalZone
                          ? `${selectedLocalZone.city} • ${formatCurrency(selectedLocalZone.price)}`
                          : "Entrega local pendente"
                        : selectedShippingService
                          ? `${selectedShippingService.carrier} • ${formatCurrency(selectedShippingService.price)}`
                          : "Frete nacional pendente"}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3 text-base font-semibold text-white">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-sm border border-white/5 bg-zinc-900 p-6">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-[var(--color-primary)]" />
              <div>
                <h2 className="font-heading text-sm uppercase tracking-wider text-white">Entrega</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Escolha retirada, entrega local ou frete nacional conforme a venda.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="label-admin">Tipo de Entrega</label>
                <select
                  value={shippingType}
                  onChange={(event) => setShippingType(event.target.value as typeof shippingType)}
                  className="input-admin"
                >
                  <option value="PICKUP">Retirada na Loja</option>
                  <option value="LOCAL_DELIVERY">Entrega Local</option>
                  <option value="NATIONAL">Entrega Nacional</option>
                </select>
              </div>

              {shippingType !== "PICKUP" ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="label-admin">Rua</label>
                    <input
                      value={address.addressStreet}
                      onChange={(event) => handleAddressChange("addressStreet", event.target.value)}
                      className="input-admin"
                    />
                  </div>

                  <div>
                    <label className="label-admin">Número</label>
                    <input
                      value={address.addressNumber}
                      onChange={(event) => handleAddressChange("addressNumber", event.target.value)}
                      className="input-admin"
                    />
                  </div>

                  <div>
                    <label className="label-admin">Complemento</label>
                    <input
                      value={address.addressComplement}
                      onChange={(event) => handleAddressChange("addressComplement", event.target.value)}
                      className="input-admin"
                    />
                  </div>

                  <div>
                    <label className="label-admin">Bairro</label>
                    <input
                      value={address.addressNeighborhood}
                      onChange={(event) => handleAddressChange("addressNeighborhood", event.target.value)}
                      className="input-admin"
                    />
                  </div>

                  <div>
                    <label className="label-admin">Cidade</label>
                    <input
                      value={address.addressCity}
                      onChange={(event) => handleAddressChange("addressCity", event.target.value)}
                      className="input-admin"
                    />
                  </div>

                  <div>
                    <label className="label-admin">Estado</label>
                    <input
                      value={address.addressState}
                      onChange={(event) => handleAddressChange("addressState", event.target.value)}
                      className="input-admin"
                      placeholder="CE"
                    />
                  </div>

                  <div>
                    <label className="label-admin">CEP</label>
                    <input
                      value={address.addressZip}
                      onChange={(event) => handleAddressChange("addressZip", maskPostalCodeInput(event.target.value))}
                      className="input-admin"
                      placeholder="00000-000"
                      inputMode="numeric"
                    />
                  </div>
                </div>
              ) : null}

              {shippingType === "LOCAL_DELIVERY" ? (
                <div className="rounded-sm border border-white/5 bg-black/30 px-4 py-4 text-sm">
                  {isLoadingLocalZones ? (
                    <p className="text-gray-400">Carregando zonas locais...</p>
                  ) : selectedLocalZone ? (
                    <>
                      <p className="font-medium text-white">Entrega Local Disponível</p>
                      <p className="mt-2 text-gray-300">
                        {selectedLocalZone.city}/{selectedLocalZone.state} • {formatCurrency(selectedLocalZone.price)}
                      </p>
                      <p className="text-xs text-gray-500">{selectedLocalZone.deadlineText}</p>
                    </>
                  ) : (
                    <p className="text-gray-400">
                      Informe uma cidade/estado atendidos para calcular a entrega local.
                    </p>
                  )}
                </div>
              ) : null}

              {shippingType === "NATIONAL" ? (
                <div className="space-y-4 rounded-sm border border-white/5 bg-black/30 px-4 py-4">
                  <div>
                    <p className="font-medium text-white">Frete Nacional</p>
                    <p className="text-xs text-gray-500">
                      O cálculo considera os itens atuais do pedido e o CEP informado.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCalculateNationalShipping}
                    disabled={isCalculatingShipping || items.length === 0}
                    className="inline-flex items-center gap-2 rounded-sm border border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-gray-200 transition-colors hover:border-[var(--color-primary)] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isCalculatingShipping ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Calculando
                      </>
                    ) : (
                      <>
                        <Truck className="h-4 w-4" /> Calcular Frete
                      </>
                    )}
                  </button>
                </div>
              ) : null}

              {shippingFeedback ? (
                <p
                  className={`rounded-sm border px-4 py-3 text-sm ${
                    shippingFeedback.type === "success"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-red-500/30 bg-red-500/10 text-red-300"
                  }`}
                >
                  {shippingFeedback.message}
                </p>
              ) : null}

              {shippingServices.length > 0 && shippingType === "NATIONAL" ? (
                <div>
                  <label className="label-admin">Serviço de Frete</label>
                  <select
                    value={selectedShippingServiceId}
                    onChange={(event) => setSelectedShippingServiceId(event.target.value)}
                    className="input-admin"
                  >
                    {shippingServices.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.carrier} • {service.name} • {formatCurrency(service.price)} • {service.deliveryTime}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-sm border border-white/5 bg-zinc-900 p-6">
            <div className="flex items-center gap-3">
              <WalletCards className="h-5 w-5 text-[var(--color-primary)]" />
              <div>
                <h2 className="font-heading text-sm uppercase tracking-wider text-white">Pagamento</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Defina como a venda presencial será registrada no pedido.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label-admin">Método</label>
                  <select
                    value={paymentMethod}
                    onChange={(event) => setPaymentMethod(event.target.value as typeof paymentMethod)}
                    className="input-admin"
                  >
                    {(["CASH", "MANUAL_PIX", "POS_DEBIT", "POS_CREDIT"] as const).map((method) => (
                      <option key={method} value={method}>
                        {getPaymentMethodLabel(method)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label-admin">Status Inicial</label>
                  <select
                    value={paymentStatus}
                    onChange={(event) => setPaymentStatus(event.target.value as typeof paymentStatus)}
                    className="input-admin"
                  >
                    <option value="PAID">Pago</option>
                    <option value="PENDING">Pendente</option>
                  </select>
                </div>
              </div>

              {isManualPixPayment ? (
                <div className="rounded-sm border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 px-4 py-4 text-sm text-gray-200">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]">Chave Pix da Loja</p>
                  <p className="mt-2 break-all font-mono text-xs text-white">{pixKey ?? "Cadastre a chave Pix nas configurações."}</p>
                </div>
              ) : null}

              {shouldShowReference ? (
                <div>
                  <label className="label-admin">
                    {isManualPixPayment ? "Referência do Pix" : "Referência da Operação"}
                  </label>
                  <input
                    value={manualPaymentReference}
                    onChange={(event) => setManualPaymentReference(event.target.value)}
                    className="input-admin"
                    placeholder={
                      isManualPixPayment
                        ? "Ex.: comprovante, ID da transação ou referência interna"
                        : "Ex.: NSU, autorização ou observação da maquineta"
                    }
                  />
                </div>
              ) : null}

              {isCashPayment ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="label-admin">Valor Recebido</label>
                    <input
                      value={cashReceivedAmount}
                      onChange={(event) => setCashReceivedAmount(maskCurrencyInput(event.target.value))}
                      className="input-admin"
                      placeholder="R$ 0,00"
                      inputMode="numeric"
                    />
                  </div>

                  <div>
                    <label className="label-admin">Troco Calculado</label>
                    <input
                      value={formatCurrencyInputValue(computedChangeAmount)}
                      className="input-admin"
                      placeholder="R$ 0,00"
                      inputMode="numeric"
                      disabled
                    />
                  </div>
                </div>
              ) : null}

              {paymentMethod === "POS_CREDIT" ? (
                <div>
                  <label className="label-admin">Parcelamento</label>
                  <select
                    value={paymentInstallments}
                    onChange={(event) => setPaymentInstallments(event.target.value)}
                    className="input-admin"
                  >
                    {Array.from({ length: 12 }, (_, index) => index + 1).map((installment) => (
                      <option key={installment} value={String(installment)}>
                        {installment}x
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div>
                <label className="label-admin">Observações</label>
                <textarea
                  value={manualPaymentNotes}
                  onChange={(event) => setManualPaymentNotes(event.target.value)}
                  className="input-admin min-h-[120px] resize-y"
                  placeholder="Notas de caixa, comprovante, operadora ou orientação interna."
                />
              </div>
            </div>
          </section>

          <section className="rounded-sm border border-white/5 bg-zinc-900 p-6">
            <h2 className="font-heading text-sm uppercase tracking-wider text-white">Conclusão do Pedido</h2>
            <p className="mt-2 text-sm text-gray-500">
              Finalize a venda somente depois de revisar entrega e pagamento.
            </p>

            <div className="mt-6 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-sm border border-white/5 bg-black/30 px-4 py-4">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Entrega</p>
                  <p className="mt-2 text-sm font-medium text-white">
                    {shippingType === "PICKUP"
                      ? "Retirada em loja"
                      : shippingType === "LOCAL_DELIVERY"
                        ? "Entrega local"
                        : "Entrega nacional"}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {shippingType === "PICKUP"
                      ? "Pronta para concluir"
                      : isDeliveryReady
                        ? "Configuração concluída"
                        : "Configuração pendente"}
                  </p>
                </div>

                <div className="rounded-sm border border-white/5 bg-black/30 px-4 py-4">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Pagamento</p>
                  <p className="mt-2 text-sm font-medium text-white">{getPaymentMethodLabel(paymentMethod)}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {paymentStatus === "PAID" ? "Marcado como pago" : "Marcado como pendente"}
                  </p>
                </div>
              </div>

              <div className="rounded-sm border border-white/5 bg-black/30 px-4 py-4">
                <div className="flex items-center justify-between text-sm text-gray-400">
                  <span>Itens</span>
                  <span>{items.length}</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm text-gray-400">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm text-gray-400">
                  <span>Entrega</span>
                  <span>{formatCurrency(shippingCost)}</span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3 text-base font-semibold text-white">
                  <span>Total Final</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>

              {!isDeliveryReady ? (
                <p className="rounded-sm border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  Configure a entrega antes de concluir o pedido.
                </p>
              ) : null}

              {checkoutFeedback ? (
                <p
                  className={`rounded-sm border px-4 py-3 text-sm ${
                    checkoutFeedback.type === "success"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-red-500/30 bg-red-500/10 text-red-300"
                  }`}
                >
                  {checkoutFeedback.message}
                </p>
              ) : null}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !canSubmitOrder}
                className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-[var(--color-primary)] px-6 py-3 text-xs font-bold uppercase tracking-widest text-black transition-colors hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Finalizando...
                  </>
                ) : (
                  "Criar Pedido Presencial"
                )}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
