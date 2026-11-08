import React from "react"
import Link from "next/link"
import { MessageCircle, Instagram, Mail, ArrowUpRight, MapPin } from "lucide-react"
import { formatStoreWhatsApp } from "@/lib/store-settings"
import { buildWhatsAppUrl } from "@/lib/whatsapp"
import type { StoreContactSettings } from "@/lib/store-location"

export default function StoreContact({ settings }: { settings: StoreContactSettings }) {
  const channels = [
    { title: "WhatsApp", description: "Tire dúvidas sobre produtos, pedidos e disponibilidade com a equipe da loja.", label: formatStoreWhatsApp(settings.whatsapp), href: buildWhatsAppUrl(settings.whatsapp, "Olá! Quero falar com a equipe da Brabus."), icon: MessageCircle },
    { title: "Instagram", description: "Acompanhe as novidades e fale com a Brabu’s pelo perfil oficial.", label: settings.instagram, href: settings.instagramUrl, icon: Instagram },
    { title: "E-mail", description: "Entre em contato por e-mail para dúvidas e parcerias.", label: "contato@brabusstore.com", href: "mailto:contato@brabusstore.com", icon: Mail },
  ]
  return (
    <div className="storefront-container storefront-page">
      <header className="storefront-page-heading">
        <p className="storefront-eyebrow">Atendimento Brabu’s</p>
        <h1>Fale <span>conosco</span></h1>
        <p>Dúvidas sobre produtos, pedidos ou parcerias? Escolha um dos canais abaixo para falar com a nossa equipe.</p>
      </header>
      <div className="storefront-contact-grid">
        {channels.map(({ title, description, label, href, icon: Icon }) => (
          <section className="storefront-contact-card" key={title}>
            <span className="storefront-channel-icon"><Icon aria-hidden="true" /></span>
            <h2>{title}</h2>
            <p>{description}</p>
            <a href={href} target={title === "E-mail" ? undefined : "_blank"} rel={title === "E-mail" ? undefined : "noopener noreferrer"}>{label}<ArrowUpRight aria-hidden="true" size={18} /></a>
          </section>
        ))}
      </div>
      <section className="storefront-contact-visit">
        <MapPin aria-hidden="true" />
        <div><h2>Prefere vir à loja?</h2><p>{settings.addressStreet} · {settings.addressCity} — {settings.addressState} · CEP {settings.addressZip}</p><p>{settings.openingHours}</p></div>
        <Link className="storefront-button storefront-button-secondary" href="/loja">Ver localização <ArrowUpRight aria-hidden="true" size={18} /></Link>
      </section>
    </div>
  )
}
