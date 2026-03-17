import { MapPin, Clock, Phone, Navigation } from "lucide-react";

export default function LojaFisica() {
  return (
    <div className="container mx-auto px-4 py-12 lg:py-20">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <h1 className="text-4xl md:text-5xl font-heading tracking-wider uppercase mb-4">Nossa <span className="text-[var(--color-primary)]">Loja Física</span></h1>
        <p className="text-gray-400">Venha conhecer nosso espaço em Aracoiaba. O melhor suporte, atendimento especializado e os melhores suplementos da região.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* Informações da Loja */}
        <div className="space-y-8 glass p-8 rounded-sm border border-white/5">
          <div className="flex items-start gap-4">
             <div className="bg-[var(--color-primary)]/10 p-3 rounded-full">
               <MapPin className="text-[var(--color-primary)] w-6 h-6" />
             </div>
             <div>
               <h3 className="text-xl font-heading tracking-wider uppercase mb-2">Endereço</h3>
               <p className="text-gray-400">Rua Antônio Lopes, 571<br/>Conjunto Cohab<br/>Aracoiaba - CE<br/>CEP: 62765-000</p>
             </div>
          </div>

          <div className="flex items-start gap-4">
             <div className="bg-[var(--color-primary)]/10 p-3 rounded-full">
               <Clock className="text-[var(--color-primary)] w-6 h-6" />
             </div>
             <div>
               <h3 className="text-xl font-heading tracking-wider uppercase mb-2">Horário de Funcionamento</h3>
               <ul className="text-gray-400 space-y-1">
                 <li><strong className="text-white">Segunda a Sexta:</strong> 08:00 às 18:00</li>
                 <li><strong className="text-white">Sábado:</strong> 08:00 às 13:00</li>
                 <li><strong className="text-white">Domingo:</strong> Fechado</li>
               </ul>
             </div>
          </div>

          <div className="flex items-start gap-4">
             <div className="bg-[var(--color-primary)]/10 p-3 rounded-full">
               <Phone className="text-[var(--color-primary)] w-6 h-6" />
             </div>
             <div>
               <h3 className="text-xl font-heading tracking-wider uppercase mb-2">Contato</h3>
               <p className="text-gray-400">WhatsApp: (85) 99783-9040</p>
             </div>
          </div>

          <div className="pt-8 border-t border-white/10 flex gap-4">
            <a href="https://maps.google.com/?q=Rua+Antônio+Lopes,+571,-+Conjunto+Cohab,+Aracoiaba+-+CE" target="_blank" rel="noopener noreferrer" className="flex-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-black font-bold uppercase tracking-widest py-4 px-6 rounded-sm transition-all flex items-center justify-center gap-2 text-sm text-center">
              <Navigation className="w-4 h-4" /> Abrir no Maps
            </a>
          </div>
        </div>

        {/* Mapa / Placeholder Foto */}
        <div className="relative aspect-square lg:aspect-auto lg:h-full bg-zinc-900 rounded-sm overflow-hidden border border-white/10 group">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
           {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop" 
            alt="Fachada da Loja" 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-60"
          />
          <div className="absolute bottom-8 left-8 right-8 z-20 text-center">
             <h3 className="text-3xl font-heading tracking-wider uppercase mb-2 text-white shadow-black drop-shadow-lg">A casa dos Brabus</h3>
             <p className="text-gray-300 drop-shadow-md">Seu ponto de encontro no Maciço.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
