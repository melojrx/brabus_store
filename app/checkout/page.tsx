import CheckoutPageClient from "@/app/checkout/CheckoutPageClient"
import { getPublicStoreSettings } from "@/lib/store-settings"

export default async function CheckoutPage() {
  const storeSettings = await getPublicStoreSettings()

  return (
    <CheckoutPageClient
      pixKey={storeSettings.pixKey}
    />
  )
}
