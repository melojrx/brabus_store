import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const GUEST_CART_OWNER = "__guest__"

export interface CartItem {
  lineId?: string
  productId: string
  productSlug?: string
  productName: string
  price: number
  quantity: number
  image?: string
  stock: number
  productVariantId?: string | null
  variantName?: string | null
  selectedSize?: string
  selectedColor?: string
  selectedFlavor?: string
}

function normalizeCartLineId(item: Pick<CartItem, 'productId' | 'productVariantId' | 'selectedSize' | 'selectedColor' | 'selectedFlavor'>) {
  if (item.productVariantId) {
    return `variant:${item.productVariantId}`
  }

  return [
    'product',
    item.productId,
    item.selectedSize ?? '',
    item.selectedColor ?? '',
    item.selectedFlavor ?? '',
  ].join(':')
}

function normalizeCartItem(item: CartItem): CartItem {
  return {
    ...item,
    lineId: item.lineId ?? normalizeCartLineId(item),
    productSlug: item.productSlug ?? undefined,
    productVariantId: item.productVariantId ?? null,
    variantName: item.variantName ?? null,
    selectedSize: item.selectedSize ?? undefined,
    selectedColor: item.selectedColor ?? undefined,
    selectedFlavor: item.selectedFlavor ?? undefined,
  }
}

function normalizeCartItems(items: CartItem[] | undefined) {
  return Array.isArray(items) ? items.map(normalizeCartItem) : []
}

function resolveCartOwnerKey(userId?: string | null) {
  return typeof userId === "string" && userId.trim().length > 0 ? userId.trim() : GUEST_CART_OWNER
}

function buildCartStateUpdate(state: Pick<CartState, "ownerKey" | "cartsByOwner">, items: CartItem[]) {
  const normalizedItems = normalizeCartItems(items)

  return {
    items: normalizedItems,
    cartsByOwner: {
      ...state.cartsByOwner,
      [state.ownerKey]: normalizedItems,
    },
  }
}

interface CartState {
  items: CartItem[]
  ownerKey: string
  cartsByOwner: Record<string, CartItem[]>
  hasHydrated: boolean
  setHasHydrated: (value: boolean) => void
  addItem: (item: CartItem) => void
  removeItem: (lineId: string) => void
  updateQuantity: (lineId: string, quantity: number) => void
  clearCart: () => void
  syncCartOwner: (userId?: string | null) => void
  getTotal: () => number
  getItemCount: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      ownerKey: GUEST_CART_OWNER,
      cartsByOwner: {
        [GUEST_CART_OWNER]: [],
      },
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      
      addItem: (newItem) => set((state) => {
        const normalizedItem = normalizeCartItem(newItem)
        const existingItemIndex = state.items.findIndex(
          (item) => item.lineId === normalizedItem.lineId
        )
        
        if (existingItemIndex >= 0) {
          const updatedItems = [...state.items]
          const existingItem = updatedItems[existingItemIndex]
          
          if (existingItem.quantity + normalizedItem.quantity <= existingItem.stock) {
            existingItem.quantity += normalizedItem.quantity
          } else {
            existingItem.quantity = existingItem.stock // Cap to stock max
          }
          
          return buildCartStateUpdate(state, updatedItems)
        }
        
        return buildCartStateUpdate(state, [...state.items, normalizedItem])
      }),

      removeItem: (lineId) => set((state) => buildCartStateUpdate(
        state,
        state.items.filter((item) => item.lineId !== lineId)
      )),

      updateQuantity: (lineId, quantity) => set((state) => {
        return buildCartStateUpdate(
          state,
          state.items.map((item) => {
            if (item.lineId === lineId) {
               return { ...item, quantity: Math.min(Math.max(1, quantity), item.stock) }
            }
            return item
          }),
        )
      }),

      clearCart: () => set((state) => buildCartStateUpdate(state, [])),

      syncCartOwner: (userId) => set((state) => {
        const nextOwnerKey = resolveCartOwnerKey(userId)

        if (state.ownerKey === nextOwnerKey) {
          return state
        }

        const currentItems = normalizeCartItems(state.items)
        const nextCartsByOwner = {
          ...state.cartsByOwner,
          [state.ownerKey]: currentItems,
        }
        const nextItems = normalizeCartItems(nextCartsByOwner[nextOwnerKey])

        return {
          ownerKey: nextOwnerKey,
          items: nextItems,
          cartsByOwner: nextCartsByOwner,
        }
      }),

      getTotal: () => {
        const items = get().items
        return items.reduce((total, item) => total + (item.price * item.quantity), 0)
      },

      getItemCount: () => {
        const items = get().items
        return items.reduce((count, item) => count + item.quantity, 0)
      }
    }),
    {
      name: 'brabus-cart-storage',
      version: 3,
      partialize: (state) => ({
        items: state.items,
        ownerKey: state.ownerKey,
        cartsByOwner: state.cartsByOwner,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
      migrate: (persistedState) => {
        const state = persistedState as Partial<CartState> | undefined

        if (!state) {
          return {
            items: [],
            ownerKey: GUEST_CART_OWNER,
            cartsByOwner: {
              [GUEST_CART_OWNER]: [],
            },
            hasHydrated: false,
          }
        }

        const guestItems = normalizeCartItems(state.items)
        const ownerKey = typeof state.ownerKey === "string" && state.ownerKey.length > 0 ? state.ownerKey : GUEST_CART_OWNER
        const persistedCartsByOwner = state.cartsByOwner ?? {}
        const normalizedCartsByOwner = Object.fromEntries(
          Object.entries(persistedCartsByOwner).map(([key, items]) => [key, normalizeCartItems(items)])
        )

        return {
          items: normalizeCartItems(normalizedCartsByOwner[ownerKey] ?? guestItems),
          ownerKey,
          cartsByOwner: {
            [GUEST_CART_OWNER]: guestItems,
            ...normalizedCartsByOwner,
          },
          hasHydrated: false,
        }
      },
    }
  )
)
