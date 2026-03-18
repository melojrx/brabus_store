"use client"

import { useEffect } from "react"
import { useCartStore } from "@/store/cartStore"
import Link from "next/link"
import { CheckCircle, MessageCircle } from "lucide-react"

export default function CheckoutSuccessPage() {
  const { clearCart } = useCartStore()

  useEffect(() => {
    // Limpa o carrinho após o sucesso
    clearCart()
  }, [clearCart])

  return (
    <div className="container mx-auto px-4 py-20 min-h-[70vh] flex flex-col items-center justify-center text-center">
      <div className="w-24 h-24 bg-[var(--color-primary)]/10 rounded-full flex items-center justify-center mb-8">
         <CheckCircle className="w-12 h-12 text-[var(--color-primary)]" />
      </div>
      
      <h1 className="text-4xl md:text-5xl font-heading tracking-wider uppercase mb-6">Pagamento <span className="text-[var(--color-primary)]">Aprovado!</span></h1>
      
      <p className="text-gray-400 mb-8 max-w-lg mx-auto">
        Seu pedido foi registrado e nossa equipe já está separando seus produtos.
        Para acelerar o processo ou combinar a retirada, chame a gente no WhatsApp.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 mb-12">
        <a href="https://wa.me/5585997839040?text=Olá!%20Acabei%20de%20fazer%20um%20pedido%20no%20site." target="_blank" rel="noopener noreferrer" className="bg-green-500 hover:bg-green-600 text-white font-bold uppercase tracking-widest py-4 px-8 rounded-sm transition-all flex items-center justify-center gap-2">
          <MessageCircle className="w-5 h-5" /> Falar no WhatsApp
        </a>
        <Link href="/account/orders" className="glass hover:bg-white/10 text-white font-bold uppercase tracking-widest py-4 px-8 rounded-sm transition-all flex items-center justify-center">
          Ver Meus Pedidos
        </Link>
      </div>
    </div>
  )
}
