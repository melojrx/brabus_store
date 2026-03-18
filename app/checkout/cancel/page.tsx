import Link from "next/link"
import { XCircle, ArrowLeft } from "lucide-react"

export default function CheckoutCancelPage() {
  return (
    <div className="container mx-auto px-4 py-20 min-h-[70vh] flex flex-col items-center justify-center text-center">
      <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-8">
         <XCircle className="w-12 h-12 text-red-500" />
      </div>
      
      <h1 className="text-4xl md:text-5xl font-heading tracking-wider uppercase mb-6">Checkout <span className="text-red-500">Cancelado</span></h1>
      
      <p className="text-gray-400 mb-8 max-w-lg mx-auto">
        O pagamento não foi concluído. Seus itens continuam no carrinho para você tentar novamente com cartão, Pix ou boleto.
      </p>

      <Link href="/checkout" className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-black font-bold uppercase tracking-widest py-4 px-8 rounded-sm transition-all flex items-center justify-center gap-2">
        <ArrowLeft className="w-5 h-5" /> Voltar para o Checkout
      </Link>
    </div>
  )
}
