import { auth } from "@/auth"
import { redirect } from "next/navigation"
import PdvManager from "@/app/admin/pdv/PdvManager"
import { getPublicStoreSettings } from "@/lib/store-settings"

export default async function AdminPdvPage() {
  const session = await auth()

  if (!session || session.user?.role !== "ADMIN") {
    redirect("/")
  }

  const storeSettings = await getPublicStoreSettings()

  return <PdvManager pixKey={storeSettings.pixKey} />
}
