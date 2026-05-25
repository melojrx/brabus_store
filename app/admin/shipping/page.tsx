import { auth } from "@/auth"
import { redirect } from "next/navigation"
import ShippingZonesManager from "./ShippingZonesManager"
import { isStaffRole } from "@/lib/auth-guard"
import prisma from "@/lib/prisma"

export default async function AdminShipping() {
  const session = await auth()
  if (!session || !isStaffRole(session.user?.role)) redirect("/")

  const rawZones = await prisma.localDeliveryZone.findMany({ orderBy: { city: "asc" } })
  const zones = rawZones.map((z) => ({ ...z, price: z.price.toNumber() }))

  return <ShippingZonesManager initialZones={zones} />
}
