import { getPublicStoreSettings } from "@/lib/store-settings"
import StorefrontFooter from "@/components/storefront/StorefrontFooter"
import LegacyFooter from "@/components/LegacyFooter"
import FooterTheme from "@/components/FooterTheme"

export default async function Footer() {
  const settings = await getPublicStoreSettings()
  return <FooterTheme storefront={<StorefrontFooter settings={settings} />} legacy={<LegacyFooter settings={settings} />} />
}
