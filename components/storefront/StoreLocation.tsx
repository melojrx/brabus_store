import React from "react"
import StoreMap from "@/components/storefront/StoreMap"
import { MapPin, Clock, MessageCircle, ArrowUpRight } from "lucide-react"
import { formatStoreWhatsApp } from "@/lib/store-settings"
import { buildWhatsAppUrl } from "@/lib/whatsapp"
import { getStoreMapLinks, type StoreContactSettings } from "@/lib/store-location"

export default function StoreLocation({ settings }: { settings: StoreContactSettings }) {
  const maps = getStoreMapLinks(settings)
  return (
    <div className="storefront-container storefront-page">
      <header className="storefront-page-heading">
        <p className="storefront-eyebrow">Aracoiaba · Ceará</p>
        <h1>Nossa <span>loja física</span></h1>
        <p>Encontre a Brabu’s e conheça os suplementos, a moda masculina e os acessórios disponíveis na loja.</p>
      </header>
      <section className="storefront-location" aria-labelledby="visit-heading">
        <div className="storefront-location-address">
          <span className="storefront-channel-icon"><MapPin aria-hidden="true" /></span>
          <h2 id="visit-heading">Visite a loja</h2>
          <address>{settings.addressStreet}<br />{settings.addressComplement}<br />{settings.addressCity} — {settings.addressState}<br />CEP {settings.addressZip}</address>
          <a className="storefront-button storefront-button-secondary" href={maps.open} target="_blank" rel="noopener noreferrer">Abrir no Google Maps <ArrowUpRight aria-hidden="true" size={18} /></a>
        </div>
        <StoreMap />
      </section>
      <div className="storefront-visit-details">
        <section className="storefront-detail"><Clock aria-hidden="true" /><div><h2>Horário de atendimento</h2><p>{settings.openingHours}</p></div></section>
        <section className="storefront-detail"><MessageCircle aria-hidden="true" /><div><h2>Fale com a loja</h2><a href={buildWhatsAppUrl(settings.whatsapp, "Olá! Quero saber mais sobre a loja física da Brabu’s.")} target="_blank" rel="noopener noreferrer">{formatStoreWhatsApp(settings.whatsapp)} <ArrowUpRight aria-hidden="true" size={16} /></a></div></section>
      </div>
    </div>
  )
}
