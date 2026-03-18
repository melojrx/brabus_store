import { randomUUID } from "node:crypto"
import { mkdir, unlink, writeFile } from "node:fs/promises"
import path from "node:path"

export const PRODUCT_IMAGE_UPLOAD_PUBLIC_DIR = "/uploads/products"
export const PRODUCT_IMAGE_UPLOAD_ABSOLUTE_DIR = path.join(
  process.cwd(),
  "public",
  "uploads",
  "products",
)
export const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024

const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
}

function getFileExtension(file: File) {
  const extensionFromMime = MIME_TO_EXTENSION[file.type]

  if (extensionFromMime) {
    return extensionFromMime
  }

  const extensionFromName = path.extname(file.name).toLowerCase()
  return [".jpg", ".jpeg", ".png", ".webp", ".avif"].includes(extensionFromName)
    ? extensionFromName
    : null
}

export function isManagedProductImagePath(value: string | null | undefined) {
  return typeof value === "string" && value.startsWith(`${PRODUCT_IMAGE_UPLOAD_PUBLIC_DIR}/`)
}

function resolveManagedProductImagePath(value: string) {
  if (!isManagedProductImagePath(value)) {
    return null
  }

  const trimmedPath = value.startsWith("/") ? value.slice(1) : value
  const absolutePath = path.join(process.cwd(), "public", trimmedPath)
  const normalizedAbsolutePath = path.normalize(absolutePath)

  if (!normalizedAbsolutePath.startsWith(PRODUCT_IMAGE_UPLOAD_ABSOLUTE_DIR)) {
    return null
  }

  return normalizedAbsolutePath
}

export async function saveUploadedProductImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error(`O arquivo "${file.name}" não é uma imagem válida.`)
  }

  if (file.size <= 0) {
    throw new Error(`O arquivo "${file.name}" está vazio.`)
  }

  if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
    throw new Error(`A imagem "${file.name}" excede o limite de 5 MB.`)
  }

  const extension = getFileExtension(file)

  if (!extension) {
    throw new Error(`Formato não suportado para "${file.name}". Use JPG, PNG, WEBP ou AVIF.`)
  }

  await mkdir(PRODUCT_IMAGE_UPLOAD_ABSOLUTE_DIR, { recursive: true })

  const fileName = `${randomUUID()}${extension === ".jpeg" ? ".jpg" : extension}`
  const filePath = path.join(PRODUCT_IMAGE_UPLOAD_ABSOLUTE_DIR, fileName)
  const buffer = Buffer.from(await file.arrayBuffer())

  await writeFile(filePath, buffer)

  return `${PRODUCT_IMAGE_UPLOAD_PUBLIC_DIR}/${fileName}`
}

export async function deleteManagedProductImage(value: string) {
  const resolvedPath = resolveManagedProductImagePath(value)

  if (!resolvedPath) {
    return
  }

  try {
    await unlink(resolvedPath)
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException

    if (nodeError.code !== "ENOENT") {
      throw error
    }
  }
}

export async function cleanupOrphanedManagedProductImages(
  prisma: {
    product: {
      count(args: { where: { images: { has: string } } }): Promise<number>
    }
  },
  imagePaths: readonly string[],
) {
  const managedPaths = Array.from(
    new Set(imagePaths.filter((imagePath) => isManagedProductImagePath(imagePath))),
  )

  for (const imagePath of managedPaths) {
    const references = await prisma.product.count({
      where: {
        images: {
          has: imagePath,
        },
      },
    })

    if (references === 0) {
      await deleteManagedProductImage(imagePath)
    }
  }
}
