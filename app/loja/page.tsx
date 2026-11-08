import StoreLocation from "@/components/storefront/StoreLocation"
import { getPublicStoreSettings } from "@/lib/store-settings"

export default async function LojaFisica() {
  return <StoreLocation settings={await getPublicStoreSettings()} />
}
