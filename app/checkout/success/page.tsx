import CheckoutSuccessPageClient from "../CheckoutSuccessPageClient"
import OnlineSalesUnavailable from "@/components/OnlineSalesUnavailable"
import { isOnlineSalesEnabled } from "@/lib/online-sales"
import { getPublicStoreSettings } from "@/lib/store-settings"

export default async function CheckoutSuccessPage() {
  if (!isOnlineSalesEnabled()) {
    const storeSettings = await getPublicStoreSettings()
    return <OnlineSalesUnavailable whatsapp={storeSettings.whatsapp} />
  }

  return <CheckoutSuccessPageClient />
}
