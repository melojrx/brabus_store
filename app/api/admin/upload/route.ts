import { z } from "zod"
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  deleteManagedProductImage,
  isManagedProductImagePath,
  saveUploadedProductImage,
} from "@/lib/admin-product-images"

export const runtime = "nodejs"

const cleanupUploadSchema = z.object({
  urls: z.array(z.string().trim()).default([]),
})

async function checkAdmin() {
  const session = await auth()
  return session?.user?.role === "ADMIN"
}

export async function POST(req: Request) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const files = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File)

    if (files.length === 0) {
      return NextResponse.json({ error: "Envie ao menos uma imagem." }, { status: 400 })
    }

    const urls = await Promise.all(files.map((file) => saveUploadedProductImage(file)))

    return NextResponse.json({ urls }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível enviar as imagens."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(req: Request) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { urls } = cleanupUploadSchema.parse(body)

    await Promise.all(
      urls
        .filter((url) => isManagedProductImagePath(url))
        .map((url) => deleteManagedProductImage(url)),
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível limpar as imagens."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
