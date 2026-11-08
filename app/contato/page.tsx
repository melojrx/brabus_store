import StoreContact from "@/components/storefront/StoreContact"
import { getPublicStoreSettings } from "@/lib/store-settings"

export default async function Contato() {
  return <StoreContact settings={await getPublicStoreSettings()} />
}
