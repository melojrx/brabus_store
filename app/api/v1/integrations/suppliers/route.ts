import { requireIntegrationScope, IntegrationAuthError } from "@/lib/integrations/auth"
import { integrationSuccess, integrationError } from "@/lib/integrations/response"
import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"

const MAX_PAGE_SIZE = 50
const DEFAULT_PAGE_SIZE = 20

export async function GET(req: Request) {
  try {
    await requireIntegrationScope(req, "read:suppliers")

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, Number(searchParams.get("page")) || 1)
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number(searchParams.get("pageSize")) || DEFAULT_PAGE_SIZE)
    )
    const search = searchParams.get("search")?.trim() ?? ""
    const activeParam = searchParams.get("active")

    const where: Prisma.SupplierWhereInput = {}

    if (activeParam === "true") where.active = true
    else if (activeParam === "false") where.active = false

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { contactName: { contains: search, mode: "insensitive" } },
        { cnpj: { contains: search, mode: "insensitive" } },
      ]
    }

    const [totalItems, suppliers] = await Promise.all([
      prisma.supplier.count({ where }),
      prisma.supplier.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          cpf: true,
          cnpj: true,
          personType: true,
          stateRegistration: true,
          contactName: true,
          addressStreet: true,
          addressNumber: true,
          addressComplement: true,
          addressNeighborhood: true,
          addressCity: true,
          addressState: true,
          addressZip: true,
          notes: true,
          active: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    const serialized = suppliers.map((s) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
    }))

    return integrationSuccess(serialized, {
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    })
  } catch (error) {
    if (error instanceof IntegrationAuthError) {
      return integrationError(error.code, error.message, error.status)
    }
    console.error("[suppliers/list]", error)
    return integrationError("INTERNAL_ERROR", "Erro interno.", 500)
  }
}