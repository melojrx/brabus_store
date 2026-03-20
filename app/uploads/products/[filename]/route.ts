import { readFile } from "node:fs/promises"
import path from "node:path"
import { NextResponse } from "next/server"
import { PRODUCT_IMAGE_UPLOAD_ABSOLUTE_DIR } from "@/lib/admin-product-images"

export const runtime = "nodejs"

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
}

function resolveProductImagePath(filename: string) {
  if (!filename || filename !== path.basename(filename)) {
    return null
  }

  const extension = path.extname(filename).toLowerCase()

  if (!CONTENT_TYPES[extension]) {
    return null
  }

  return path.join(PRODUCT_IMAGE_UPLOAD_ABSOLUTE_DIR, filename)
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ filename: string }> },
) {
  const { filename } = await context.params
  const filePath = resolveProductImagePath(filename)

  if (!filePath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    const file = await readFile(filePath)
    const extension = path.extname(filename).toLowerCase()

    return new NextResponse(file, {
      status: 200,
      headers: {
        "Content-Type": CONTENT_TYPES[extension] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException

    if (nodeError.code === "ENOENT") {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
