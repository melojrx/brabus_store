import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { cleanupOrphanedManagedProductImages } from "@/lib/admin-product-images"
import {
  normalizeProductPayload,
  productWithRelationsInclude,
  serializeProduct,
} from "@/lib/catalog-api"
import prisma from "@/lib/prisma"

async function checkAdmin() {
  const session = await auth()
  return session?.user?.role === "ADMIN"
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    const body = await req.json()
    const { productData, variants } = normalizeProductPayload(body)
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        images: true,
      },
    })

    if (!existingProduct) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 })
    }

    if (!productData.name || !productData.slug || !productData.categoryId) {
      return NextResponse.json({ error: "Nome, slug e subcategoria são obrigatórios." }, { status: 400 })
    }

    const category = await prisma.category.findUnique({
      where: { id: productData.categoryId },
      select: { id: true, parentId: true },
    })

    if (!category) {
      return NextResponse.json({ error: "Subcategoria não encontrada." }, { status: 404 })
    }

    if (!category.parentId) {
      return NextResponse.json({ error: "Selecione uma subcategoria válida, não a categoria pai." }, { status: 400 })
    }

    const incomingVariantIds = variants
      .map((variant) => variant.id)
      .filter((variantId): variantId is string => Boolean(variantId))

    if (incomingVariantIds.length > 0) {
      const existingVariants = await prisma.productVariant.findMany({
        where: { productId: id },
        select: { id: true },
      })

      const existingVariantIds = new Set(existingVariants.map((variant) => variant.id))
      const invalidVariantIds = incomingVariantIds.filter((variantId) => !existingVariantIds.has(variantId))

      if (invalidVariantIds.length > 0) {
        return NextResponse.json(
          { error: "Uma ou mais variantes enviadas não pertencem ao produto informado." },
          { status: 400 },
        )
      }
    }

    const product = await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: productData,
      })

      await tx.productVariant.deleteMany({
        where: incomingVariantIds.length > 0
          ? { productId: id, id: { notIn: incomingVariantIds } }
          : { productId: id },
      })

      for (const variant of variants) {
        if (variant.id) {
          await tx.productVariant.update({
            where: { id: variant.id },
            data: {
              sku: variant.sku,
              name: variant.name,
              size: variant.size,
              color: variant.color,
              flavor: variant.flavor,
              stock: variant.stock,
              active: variant.active,
            },
          })
          continue
        }

        await tx.productVariant.create({
          data: {
            productId: id,
            sku: variant.sku,
            name: variant.name,
            size: variant.size,
            color: variant.color,
            flavor: variant.flavor,
            stock: variant.stock,
            active: variant.active,
          },
        })
      }

      return tx.product.findUniqueOrThrow({
        where: { id },
        include: productWithRelationsInclude,
      })
    })

    const removedImages = existingProduct.images.filter((image) => !productData.images.includes(image))
    await cleanupOrphanedManagedProductImages(prisma, removedImages)

    return NextResponse.json(serializeProduct(product))
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server Error" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        images: true,
      },
    })

    if (!existingProduct) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.productVariant.deleteMany({ where: { productId: id } })
      await tx.product.delete({ where: { id } })
    })

    await cleanupOrphanedManagedProductImages(prisma, existingProduct.images)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server Error" }, { status: 500 })
  }
}
