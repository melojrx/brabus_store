import { notFound } from "next/navigation"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import CustomerDetailClient from "./CustomerDetailClient"

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const customer = await prisma.customer.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, phone: true, active: true },
  })

  if (!customer) notFound()

  const session = await auth()
  return <CustomerDetailClient customer={customer} canManageCredit={session?.user?.role === "ADMIN"} />
}
