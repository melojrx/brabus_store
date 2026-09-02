import assert from "node:assert/strict"
import test from "node:test"
import { OrderChannel } from "@prisma/client"
import {
  getLocalDeliveryHelperText,
  isLocalDeliveryAvailable,
} from "../app/checkout/CheckoutPageClient"
import {
  DeliveryPolicyError,
  isDeliveryReady,
  resolveDelivery,
} from "../lib/delivery-policy"
import { createManualOrder } from "../lib/manual-orders"
import { createPdvOrderSchema } from "../lib/pdv"
import { createPublicCheckoutSchema } from "../lib/public-checkout"
import {
  DEFAULT_STORE_ADDRESS_CITY,
  DEFAULT_STORE_ADDRESS_STATE,
} from "../lib/store-settings"

const emptyAddress = {
  addressStreet: "",
  addressNumber: "",
  addressComplement: "",
  addressNeighborhood: "",
  addressCity: "",
  addressState: "",
  addressZip: "",
}

const validPdvPayload = {
  items: [{ productId: "product-1", productVariantId: "variant-1", quantity: 1 }],
  paymentMethod: "CASH",
  paymentStatus: "PENDING",
  paymentInstallments: null,
  manualPaymentReference: null,
  manualPaymentNotes: null,
  cashReceivedAmount: null,
  changeAmount: null,
  discountAmount: null,
}

test("describes Entrega Braba availability from the address and store location", () => {
  assert.equal(
    getLocalDeliveryHelperText({
      hasMatchingStoreLocation: false,
      isLocalDeliveryAvailable: false,
      addressCity: "Aracoiaba",
      addressState: "CE",
    }),
    "A Entrega Braba está disponível somente para Aracoiaba - CE.",
  )

  assert.equal(
    getLocalDeliveryHelperText({
      hasMatchingStoreLocation: true,
      isLocalDeliveryAvailable: false,
      addressCity: "Aracoiaba",
      addressState: "CE",
    }),
    "Preencha o endereço completo para liberar esta opção.",
  )

  assert.equal(
    getLocalDeliveryHelperText({
      hasMatchingStoreLocation: true,
      isLocalDeliveryAvailable: true,
      addressCity: "Aracoiaba",
      addressState: "CE",
    }),
    "Disponível para Aracoiaba - CE. Prazo a confirmar pela loja.",
  )
})

test("requires an eight-digit CEP for Entrega Braba availability", () => {
  assert.equal(
    isLocalDeliveryAvailable({
      hasCompleteAddress: true,
      hasMatchingStoreLocation: true,
      addressZip: "62765-000",
    }),
    true,
  )

  assert.equal(
    isLocalDeliveryAvailable({
      hasCompleteAddress: true,
      hasMatchingStoreLocation: true,
      addressZip: "1",
    }),
    false,
  )

  assert.equal(
    isLocalDeliveryAvailable({
      hasCompleteAddress: true,
      hasMatchingStoreLocation: true,
      addressZip: "627650009",
    }),
    false,
  )
})

test("resolves pickup without an address", () => {
  const delivery = resolveDelivery({
    shippingType: "PICKUP",
    store: { addressCity: "Aracoiaba", addressState: "CE" },
  })

  assert.deepEqual(delivery, {
    cost: 0,
    carrier: "Retirada na Loja",
    deadline: "Retirada imediata",
  })
})

test("accepts Entrega Braba when city and state match ignoring accents and case", () => {
  const delivery = resolveDelivery({
    shippingType: "LOCAL_DELIVERY",
    address: { addressCity: "araçoiaba", addressState: "ce" },
    store: { addressCity: "Aracoiaba", addressState: "CE" },
  })

  assert.deepEqual(delivery, {
    cost: 0,
    carrier: "Entrega Braba",
    deadline: "A confirmar pela loja",
  })
})

test("uses persisted store city and state instead of address defaults", () => {
  const store = { addressCity: "Baturité", addressState: "CE" }

  const delivery = resolveDelivery({
    shippingType: "LOCAL_DELIVERY",
    address: { addressCity: "baturite", addressState: "ce" },
    store,
  })

  assert.deepEqual(delivery, {
    cost: 0,
    carrier: "Entrega Braba",
    deadline: "A confirmar pela loja",
  })

  assert.throws(
    () =>
      resolveDelivery({
        shippingType: "LOCAL_DELIVERY",
        address: { addressCity: "Aracoiaba", addressState: "CE" },
        store,
      }),
    DeliveryPolicyError,
  )
})

test("resolves Entrega Braba with exported store address defaults", () => {
  const delivery = resolveDelivery({
    shippingType: "LOCAL_DELIVERY",
    address: {
      addressCity: DEFAULT_STORE_ADDRESS_CITY,
      addressState: DEFAULT_STORE_ADDRESS_STATE,
    },
    store: {
      addressCity: DEFAULT_STORE_ADDRESS_CITY,
      addressState: DEFAULT_STORE_ADDRESS_STATE,
    },
  })

  assert.deepEqual(delivery, {
    cost: 0,
    carrier: "Entrega Braba",
    deadline: "A confirmar pela loja",
  })
})

test("does not mark Entrega Braba ready without a complete address", () => {
  assert.equal(
    isDeliveryReady({
      shippingType: "LOCAL_DELIVERY",
      address: {
        addressStreet: "Rua Principal",
        addressNumber: "1",
        addressNeighborhood: "Centro",
        addressCity: "araçoiaba",
        addressState: "ce",
        addressZip: "",
      },
      store: {
        addressCity: "Aracoiaba",
        addressState: "CE",
      },
    }),
    false,
  )
})

test("does not mark Entrega Braba ready with a short CEP", () => {
  assert.equal(
    isDeliveryReady({
      shippingType: "LOCAL_DELIVERY",
      address: {
        addressStreet: "Rua Principal",
        addressNumber: "1",
        addressNeighborhood: "Centro",
        addressCity: "araçoiaba",
        addressState: "ce",
        addressZip: "1",
      },
      store: {
        addressCity: "Aracoiaba",
        addressState: "CE",
      },
    }),
    false,
  )
})

test("marks pickup ready without an address", () => {
  assert.equal(
    isDeliveryReady({
      shippingType: "PICKUP",
      store: {},
    }),
    true,
  )
})

test("persists Entrega Braba details for a local manual order", async () => {
  let persistedOrder: Record<string, unknown> | null = null
  const prisma = {
    storeSettings: {
      findFirst: async () => null,
    },
    productVariant: {
      findMany: async () => [
        {
          id: "variant-1",
          productId: "product-1",
          stock: 1,
          size: null,
          color: null,
          flavor: null,
          product: {
            id: "product-1",
            name: "Produto",
            slug: "produto",
            price: { toNumber: () => 10 },
            costPrice: null,
            category: {
              name: "Categoria",
              parent: null,
            },
          },
        },
      ],
    },
    $transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        orderNumberCounter: {
          upsert: async () => ({ lastValue: 1 }),
        },
        order: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            persistedOrder = data
            const items = data.items as { create: Array<Record<string, unknown>> }

            return {
              id: "order-1",
              orderNumber: data.orderNumber,
              status: data.status,
              paymentMethod: data.paymentMethod,
              paymentStatus: data.paymentStatus,
              total: { toNumber: () => data.total },
              customerNameSnapshot: data.customerNameSnapshot,
              shippingType: data.shippingType,
              shippingCarrier: data.shippingCarrier,
              shippingDeadline: data.shippingDeadline,
              cashReceivedAmount: null,
              changeAmount: null,
              createdAt: data.createdAt,
              items: items.create.map((item) => ({
                quantity: item.quantity,
                productNameSnapshot: item.productNameSnapshot,
                variantNameSnapshot: item.variantNameSnapshot,
                selectedSize: item.selectedSize,
                selectedColor: item.selectedColor,
                selectedFlavor: item.selectedFlavor,
              })),
            }
          },
        },
      }),
  }

  await createManualOrder(prisma as never, {
    userId: "customer-1",
    channel: OrderChannel.PDV,
    items: [{ productId: "product-1", productVariantId: "variant-1", quantity: 1 }],
    shippingType: "LOCAL_DELIVERY",
    address: {
      addressStreet: "Rua Principal",
      addressNumber: "1",
      addressNeighborhood: "Centro",
      addressCity: "araçoiaba",
      addressState: "ce",
      addressZip: "62765-000",
    },
    paymentMethod: "CASH",
    paymentStatus: "PENDING",
  })

  const persistedOrderData = persistedOrder as Record<string, unknown> | null

  assert.deepEqual(
    {
      shippingCost: persistedOrderData?.shippingCost,
      shippingCarrier: persistedOrderData?.shippingCarrier,
      shippingDeadline: persistedOrderData?.shippingDeadline,
    },
    {
      shippingCost: 0,
      shippingCarrier: "Entrega Braba",
      shippingDeadline: "A confirmar pela loja",
    },
  )
})

test("rejects Entrega Braba outside the store city", () => {
  assert.throws(
    () =>
      resolveDelivery({
        shippingType: "LOCAL_DELIVERY",
        address: { addressCity: "Fortaleza", addressState: "CE" },
        store: { addressCity: "Aracoiaba", addressState: "CE" },
      }),
    DeliveryPolicyError,
  )
})

test("rejects Entrega Braba when store settings and address locations are empty", () => {
  assert.throws(
    () =>
      resolveDelivery({
        shippingType: "LOCAL_DELIVERY",
        address: { addressCity: "", addressState: "" },
        store: { addressCity: "", addressState: "" },
      }),
    DeliveryPolicyError,
  )
})

test("rejects NATIONAL delivery", () => {
  assert.throws(
    () =>
      resolveDelivery({
        shippingType: "NATIONAL",
        store: { addressCity: "Aracoiaba", addressState: "CE" },
      }),
    DeliveryPolicyError,
  )
})

test("rejects NATIONAL and shippingServiceId in public checkout payloads", () => {
  const result = createPublicCheckoutSchema.safeParse({
    items: [{ productId: "product-1", quantity: 1 }],
    shippingType: "NATIONAL",
    shippingServiceId: "national-service",
    paymentMethod: "MERCADO_PAGO_PIX",
    cashReceivedAmount: null,
    address: {
      addressStreet: "Rua Principal",
      addressNumber: "1",
      addressComplement: null,
      addressNeighborhood: "Centro",
      addressCity: "Aracoiaba",
      addressState: "CE",
      addressZip: "62750000",
    },
  })

  assert.equal(result.success, false)
})

test("strips legacy shippingServiceId from a valid public pickup payload", () => {
  const result = createPublicCheckoutSchema.safeParse({
    items: [{ productId: "product-1", quantity: 1 }],
    shippingType: "PICKUP",
    shippingServiceId: "national-service",
    paymentMethod: "CASH",
    cashReceivedAmount: null,
    address: emptyAddress,
  })

  assert.equal(result.success, true)

  if (!result.success) return

  assert.equal("shippingServiceId" in result.data, false)
})

test("accepts public pickup without an address property", () => {
  const result = createPublicCheckoutSchema.safeParse({
    items: [{ productId: "product-1", quantity: 1 }],
    shippingType: "PICKUP",
    paymentMethod: "CASH",
    cashReceivedAmount: null,
  })

  assert.equal(result.success, true)
})

test("accepts public Entrega Braba with a complete address and strips shippingServiceId", () => {
  const result = createPublicCheckoutSchema.safeParse({
    items: [{ productId: "product-1", quantity: 1 }],
    shippingType: "LOCAL_DELIVERY",
    shippingServiceId: "legacy-service",
    paymentMethod: "CASH",
    cashReceivedAmount: null,
    address: {
      addressStreet: "Rua Principal",
      addressNumber: "1",
      addressComplement: null,
      addressNeighborhood: "Centro",
      addressCity: "Aracoiaba",
      addressState: "CE",
      addressZip: "62750000",
    },
  })

  assert.equal(result.success, true)

  if (!result.success) return

  assert.equal("shippingServiceId" in result.data, false)
})

test("rejects public Entrega Braba with an invalid CEP", () => {
  const result = createPublicCheckoutSchema.safeParse({
    items: [{ productId: "product-1", quantity: 1 }],
    shippingType: "LOCAL_DELIVERY",
    paymentMethod: "CASH",
    cashReceivedAmount: null,
    address: {
      addressStreet: "Rua Principal",
      addressNumber: "1",
      addressComplement: null,
      addressNeighborhood: "Centro",
      addressCity: "Aracoiaba",
      addressState: "CE",
      addressZip: "1",
    },
  })

  assert.equal(result.success, false)

  if (result.success) return

  assert.ok(
    result.error.issues.some(
      (issue) =>
        issue.path.join(".") === "address.addressZip" &&
        issue.message === "Informe um CEP válido para a Entrega Braba.",
    ),
  )
})

test("rejects public Entrega Braba with a CEP longer than eight digits", () => {
  const result = createPublicCheckoutSchema.safeParse({
    items: [{ productId: "product-1", quantity: 1 }],
    shippingType: "LOCAL_DELIVERY",
    paymentMethod: "CASH",
    cashReceivedAmount: null,
    address: {
      addressStreet: "Rua Principal",
      addressNumber: "1",
      addressComplement: null,
      addressNeighborhood: "Centro",
      addressCity: "Aracoiaba",
      addressState: "CE",
      addressZip: "627650009",
    },
  })

  assert.equal(result.success, false)
})

test("rejects public local delivery without an address property", () => {
  const result = createPublicCheckoutSchema.safeParse({
    items: [{ productId: "product-1", quantity: 1 }],
    shippingType: "LOCAL_DELIVERY",
    paymentMethod: "CASH",
    cashReceivedAmount: null,
  })

  assert.equal(result.success, false)

  if (result.success) return

  assert.ok(result.error.issues.some((issue) => issue.path[0] === "address"))
})

test("rejects NATIONAL in PDV payloads", () => {
  const result = createPdvOrderSchema.safeParse({
    ...validPdvPayload,
    shippingType: "NATIONAL",
    address: emptyAddress,
  })

  assert.equal(result.success, false)
})

test("rejects PDV local delivery without a complete address", () => {
  const result = createPdvOrderSchema.safeParse({
    ...validPdvPayload,
    shippingType: "LOCAL_DELIVERY",
    address: emptyAddress,
  })

  assert.equal(result.success, false)
})

test("rejects PDV local delivery with a short CEP", () => {
  const result = createPdvOrderSchema.safeParse({
    ...validPdvPayload,
    shippingType: "LOCAL_DELIVERY",
    address: {
      addressStreet: "Rua Principal",
      addressNumber: "1",
      addressComplement: "",
      addressNeighborhood: "Centro",
      addressCity: "Aracoiaba",
      addressState: "CE",
      addressZip: "1",
    },
  })

  assert.equal(result.success, false)

  if (result.success) return

  assert.ok(
    result.error.issues.some(
      (issue) =>
        issue.path.join(".") === "address.addressZip" &&
        issue.message === "Informe um CEP válido para a Entrega Braba.",
    ),
  )
})

test("accepts PDV pickup with an empty address", () => {
  const result = createPdvOrderSchema.safeParse({
    ...validPdvPayload,
    shippingType: "PICKUP",
    address: emptyAddress,
  })

  assert.equal(result.success, true)
})

test("accepts PDV pickup without an address property", () => {
  const result = createPdvOrderSchema.safeParse({
    ...validPdvPayload,
    shippingType: "PICKUP",
  })

  assert.equal(result.success, true)
})

test("rejects PDV local delivery without an address property", () => {
  const result = createPdvOrderSchema.safeParse({
    ...validPdvPayload,
    shippingType: "LOCAL_DELIVERY",
  })

  assert.equal(result.success, false)

  if (result.success) return

  assert.ok(result.error.issues.some((issue) => issue.path[0] === "address"))
})
