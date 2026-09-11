import { MessageCircle } from "lucide-react"
import { buildWhatsAppUrl } from "@/lib/whatsapp"
import { ONLINE_SALES_UNAVAILABLE_MESSAGE } from "@/lib/online-sales"

export default function OnlineSalesUnavailable({
  whatsapp,
  productName,
}: {
  whatsapp: string
  productName?: string
}) {
  const message = productName
    ? `Olá! Tenho interesse em ${productName}.`
    : "Olá! Quero saber mais sobre os produtos da Brabu's."

  return (
    <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-20 text-center">
      <MessageCircle className="mb-6 h-16 w-16 text-green-500" />
      <h1 className="mb-4 text-3xl font-heading uppercase tracking-wider md:text-5xl">Atendimento pelo WhatsApp</h1>
      <p className="mb-8 max-w-xl text-gray-400">{ONLINE_SALES_UNAVAILABLE_MESSAGE}</p>
      <a
        href={buildWhatsAppUrl(whatsapp, message)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 rounded-sm bg-green-600 px-8 py-4 font-bold uppercase tracking-widest text-white transition-colors hover:bg-green-500"
      >
        <MessageCircle className="h-5 w-5" /> Falar no WhatsApp
      </a>
    </div>
  )
}
