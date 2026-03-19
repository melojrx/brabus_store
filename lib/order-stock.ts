import { Prisma } from "@prisma/client"

type OrderStockItem = {
  id?: string
  productId: string
  productVariantId: string | null
  quantity: number
}

export async function decrementOrderItemStock(
  tx: Prisma.TransactionClient,
  items: OrderStockItem[],
) {
  for (const item of items) {
    if (!item.productVariantId) {
      throw new Error(`Order item ${item.id ?? item.productId} is missing productVariantId`)
    }

    const updatedVariant = await tx.productVariant.updateMany({
      where: {
        id: item.productVariantId,
        productId: item.productId,
        stock: { gte: item.quantity },
      },
      data: {
        stock: {
          decrement: item.quantity,
        },
      },
    })

    if (updatedVariant.count === 0) {
      throw new Error(`Insufficient variant stock for order item ${item.id ?? item.productVariantId}`)
    }
  }
}
