"use client"

import { useCartStore } from "@/store/cartStore"
import Link from "next/link"
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag } from "lucide-react"

export default function CartPage() {
  const { items, removeItem, updateQuantity, getTotal } = useCartStore()

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center min-h-[60vh] flex flex-col items-center justify-center">
        <ShoppingBag className="w-20 h-20 text-[var(--color-primary)]/20 mb-6" />
        <h1 className="text-3xl font-heading tracking-wider uppercase mb-4">Seu Carrinho está vazio</h1>
        <p className="text-gray-400 mb-8">Adicione os equipamentos ou suplementos para esmagar no treino.</p>
        <Link href="/products" className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-black font-bold uppercase tracking-widest py-4 px-8 rounded-sm transition-all inline-block">
          Ver Produtos
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12 lg:py-20">
      <h1 className="text-4xl md:text-5xl font-heading tracking-wider uppercase mb-12 border-b border-white/10 pb-8">Seu <span className="text-[var(--color-primary)]">Carrinho</span></h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
        {/* Lista de Itens */}
        <div className="lg:col-span-2 space-y-6">
          {items.map((item, index) => (
            <div key={`${item.productId}-${index}`} className="flex flex-col sm:flex-row gap-6 glass p-6 rounded-sm border border-white/5 relative">
              <div className="w-full sm:w-32 h-32 bg-white/5 rounded-sm flex items-center justify-center overflow-hidden shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image || "/placeholder.jpg"} alt={item.productName} className="object-contain w-full h-full p-2" />
              </div>
              
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-medium text-white mb-1 uppercase tracking-wider pr-8">{item.productName}</h3>
                  <div className="text-sm text-gray-400 space-y-1 mb-4">
                    {item.variantName && item.variantName !== "Default" && <p>Variação: <span className="text-white font-bold">{item.variantName}</span></p>}
                    {item.selectedSize && <p>Tamanho: <span className="text-white font-bold">{item.selectedSize}</span></p>}
                    {item.selectedColor && <p>Cor: <span className="text-white font-bold">{item.selectedColor}</span></p>}
                    {item.selectedFlavor && <p>Sabor: <span className="text-white font-bold">{item.selectedFlavor}</span></p>}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto">
                   <div className="flex items-center border border-white/20 rounded-sm overflow-hidden bg-zinc-900">
                     <button 
                       onClick={() => updateQuantity(item.lineId ?? item.productId, item.quantity - 1)} 
                       className="p-2 hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                     >
                       <Minus className="w-4 h-4" />
                     </button>
                     <span className="px-4 py-2 font-bold text-sm w-12 text-center">{item.quantity}</span>
                     <button 
                       onClick={() => updateQuantity(item.lineId ?? item.productId, item.quantity + 1)} 
                       className="p-2 hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                     >
                       <Plus className="w-4 h-4" />
                     </button>
                   </div>
                   
                   <div className="font-heading text-xl tracking-wider">
                     R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                   </div>
                </div>
              </div>

              <button 
                onClick={() => removeItem(item.lineId ?? item.productId)}
                className="absolute top-6 right-6 text-gray-500 hover:text-[var(--color-secondary)] transition-colors p-2"
                title="Remover Item"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>

        {/* Resumo */}
        <div className="glass p-8 rounded-sm border border-[var(--color-primary)]/30 sticky top-24">
          <h2 className="text-2xl font-heading tracking-wider uppercase mb-6 text-[var(--color-primary)]">Resumo do Pedido</h2>
          
          <div className="space-y-4 mb-8">
            <div className="flex justify-between text-gray-400">
               <span>Subtotal ({items.length} itens)</span>
               <span className="text-white">R$ {getTotal().toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="flex justify-between text-gray-400 pb-4 border-b border-white/10">
               <span>Frete</span>
               <span className="text-xs uppercase bg-white/10 px-2 py-1 rounded-sm text-gray-300">Calculado no Próximo Passo</span>
            </div>
            <div className="flex justify-between items-end pt-2">
               <span className="text-sm font-bold uppercase tracking-widest">Total Estimado</span>
               <span className="text-3xl font-heading tracking-wider text-[var(--color-primary)]">
                 R$ {getTotal().toFixed(2).replace('.', ',')}
               </span>
            </div>
          </div>

          <Link href="/checkout" className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-black font-bold uppercase tracking-widest py-4 px-8 rounded-sm transition-all flex items-center justify-center gap-2 w-full">
            Avançar para Checkout <ArrowRight className="w-5 h-5" />
          </Link>
          
          <div className="mt-4 text-center">
            <Link href="/products" className="text-xs text-gray-400 hover:text-[var(--color-primary)] uppercase tracking-widest font-bold">
              Continuar Comprando
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
