import { auth } from "@/auth"
import { redirect } from "next/navigation"
import ShippingZonesManager from "./ShippingZonesManager"
import prisma from "@/lib/prisma"

export default async function AdminShipping() {
  const session = await auth()
  if (!session || session.user?.role !== "ADMIN") redirect("/")

  const rawZones = await prisma.localDeliveryZone.findMany({ orderBy: { city: "asc" } })
  const zones = rawZones.map((z) => ({ ...z, price: z.price.toNumber() }))

  return <ShippingZonesManager initialZones={zones} />
}
