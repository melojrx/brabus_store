import { auth } from "@/auth"
import { redirect } from "next/navigation"
import PdvManager from "@/app/admin/pdv/PdvManager"
import { isStaffRole } from "@/lib/auth-guard"
import { getPublicStoreSettings } from "@/lib/store-settings"

export default async function AdminPdvPage() {
  const session = await auth()

  if (!session || !isStaffRole(session.user?.role)) {
    redirect("/")
  }

  const storeSettings = await getPublicStoreSettings()

  return <PdvManager pixKey={storeSettings.pixKey} />
}
