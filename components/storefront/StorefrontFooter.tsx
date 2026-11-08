import React from "react"
import Link from "next/link"
import { Instagram, MapPin, MessageCircle, ArrowUpRight } from "lucide-react"
import BrandLogo from "@/components/brand/BrandLogo"
import { formatStoreWhatsApp } from "@/lib/store-settings"
import { buildWhatsAppUrl } from "@/lib/whatsapp"
import type { StoreContactSettings } from "@/lib/store-location"

export default function StorefrontFooter({ settings }: { settings: StoreContactSettings }) {
  return (
    <footer className="brand-footer">
      <div className="brand-footer-container brand-footer-grid">
        <div className="brand-footer-intro">
          <Link href="/" className="brand-footer-logo"><BrandLogo /></Link>
          <p>Para quem treina de verdade. Suplementos, moda masculina e acessórios em Aracoiaba, no Maciço de Baturité.</p>
          <a className="brand-footer-social" href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram da Brabu’s"><Instagram aria-hidden="true" size={20} />{settings.instagram}</a>
        </div>
        <div>
          <h2>Visite a Brabu’s</h2>
          <address><MapPin aria-hidden="true" size={20} /><span>{settings.addressStreet}<br />{settings.addressComplement}<br />{settings.addressCity} — {settings.addressState}<br />CEP {settings.addressZip}</span></address>
          <a className="brand-footer-social" href={buildWhatsAppUrl(settings.whatsapp, "Olá! Quero falar com a equipe da Brabus.")} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden="true" size={20} />{formatStoreWhatsApp(settings.whatsapp)}</a>
        </div>
        <nav aria-label="Links do rodapé">
          <h2>Explore a loja</h2>
          <ul>{[
            ["/products", "Todos os produtos"], ["/products?category=suplementos", "Suplementos"], ["/products?category=roupas-fitness", "Moda masculina"], ["/products?category=acessorios", "Acessórios"], ["/loja", "Loja física"], ["/contato", "Contato"],
          ].map(([href, label]) => <li key={href}><Link href={href}>{label}<ArrowUpRight aria-hidden="true" size={14} /></Link></li>)}</ul>
        </nav>
      </div>
      <div className="brand-footer-container brand-footer-bottom"><p>© {new Date().getFullYear()} Brabu’s Performance Store. Todos os direitos reservados.</p></div>
    </footer>
  )
}
