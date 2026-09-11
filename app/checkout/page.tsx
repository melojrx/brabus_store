import CheckoutPageClient from "@/app/checkout/CheckoutPageClient"
import { getPublicStoreSettings } from "@/lib/store-settings"
import OnlineSalesUnavailable from "@/components/OnlineSalesUnavailable"
import { isOnlineSalesEnabled } from "@/lib/online-sales"

export default async function CheckoutPage() {
  const storeSettings = await getPublicStoreSettings()

  if (!isOnlineSalesEnabled()) {
    return <OnlineSalesUnavailable whatsapp={storeSettings.whatsapp} />
  }

  return (
    <CheckoutPageClient
      addressCity={storeSettings.addressCity}
      addressState={storeSettings.addressState}
    />
  )
}
