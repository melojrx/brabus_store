import Link from "next/link";
import { Instagram, MapPin, Phone } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-black border-t border-white/10 pt-16 pb-8 mt-20">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
        <div className="col-span-1 md:col-span-2">
          <h3 className="text-2xl font-heading tracking-wider uppercase text-[var(--color-primary)] mb-4">Brabu's Performance Store</h3>
          <p className="text-sm text-gray-400 mb-6 max-w-sm">
            Para quem treina de verdade. Suplementação e moda fitness de alta performance com foco no Maciço de Baturité e todo o Ceará.
          </p>
          <div className="flex gap-4">
            <a href="https://instagram.com/brabus.performancestore" target="_blank" className="text-gray-400 hover:text-white transition-colors">
              <Instagram className="w-6 h-6" />
            </a>
          </div>
        </div>

        <div>
          <h4 className="font-heading tracking-wider text-xl mb-4">Loja Física</h4>
          <ul className="space-y-3 text-sm text-gray-400">
            <li className="flex items-start gap-2">
              <MapPin className="w-5 h-5 text-[var(--color-primary)] shrink-0" />
              <span>Rua Antônio Lopes, 571<br/>Conjunto Cohab<br/>Aracoiaba - CE<br/>62765-000</span>
            </li>
            <li className="flex items-center gap-2 pt-2">
              <Phone className="w-5 h-5 text-[var(--color-primary)]" />
              <span>(85) 99783-9040</span>
            </li>
          </ul>
        </div>

        <div>
           <h4 className="font-heading tracking-wider text-xl mb-4">Links Úteis</h4>
           <ul className="space-y-2 text-sm text-gray-400">
             <li><Link href="/products" className="hover:text-white transition-colors">Todos os Produtos</Link></li>
             <li><Link href="/products?type=SUPPLEMENT" className="hover:text-white transition-colors">Suplementos</Link></li>
             <li><Link href="/products?type=FASHION" className="hover:text-white transition-colors">Moda Fitness</Link></li>
             <li><Link href="/loja" className="hover:text-white transition-colors">Como Chegar</Link></li>
             <li><Link href="/contato" className="hover:text-white transition-colors">Fale Conosco</Link></li>
           </ul>
        </div>
      </div>
      
      <div className="container mx-auto px-4 mt-8 pt-8 border-t border-white/10 text-center text-xs text-gray-500">
        <p>© {new Date().getFullYear()} Brabu's Performance Store. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}
