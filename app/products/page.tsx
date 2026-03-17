import Link from "next/link";
import { ArrowRight } from "lucide-react";

async function getProducts() {
  try {
    const res = await fetch(`${process.env.NEXTAUTH_URL}/api/products`, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch (e) {
    return [];
  }
}

export default async function Products() {
  const products = await getProducts();

  return (
    <div className="container mx-auto px-4 py-12 lg:py-20">
      <div className="flex flex-col md:flex-row items-baseline justify-between mb-12 border-b border-white/10 pb-8 gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-heading tracking-wider uppercase mb-2">Todos os <span className="text-[var(--color-primary)]">Produtos</span></h1>
          <p className="text-gray-400">Equipamento pesado e suplementação de ponta.</p>
        </div>

        <div className="flex gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
           <button className="bg-[var(--color-primary)] text-black font-bold text-xs uppercase tracking-widest px-4 py-2 rounded-sm whitespace-nowrap">Todos</button>
           <button className="border border-white/20 text-white font-bold text-xs uppercase tracking-widest px-4 py-2 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors rounded-sm whitespace-nowrap">Suplementos</button>
           <button className="border border-white/20 text-white font-bold text-xs uppercase tracking-widest px-4 py-2 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors rounded-sm whitespace-nowrap">Moda Fitness</button>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-20 text-gray-500 glass rounded-sm">
           Nenhum produto cadastrado.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product: any) => (
            <div key={product.id} className="group flex flex-col glass rounded-sm overflow-hidden border border-white/5 hover:border-[var(--color-primary)]/50 transition-colors">
              <Link href={`/products/${product.slug}`} className="relative aspect-square overflow-hidden bg-white/5 flex items-center justify-center p-4">
                {product.stock === 0 ? (
                  <span className="absolute top-2 left-2 bg-[var(--color-secondary)] text-white text-[10px] uppercase font-bold px-2 py-1 tracking-wider z-10 rounded-sm">Esgotado</span>
                ) : product.stock < 10 ? (
                  <span className="absolute top-2 left-2 bg-yellow-600 text-white text-[10px] uppercase font-bold px-2 py-1 tracking-wider z-10 rounded-sm">Últimas Unidades</span>
                ) : null}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={product.images[0] || "/placeholder.jpg"} 
                  alt={product.name} 
                  className="object-contain w-full h-full group-hover:scale-110 transition-transform duration-500"
                />
              </Link>
              <div className="p-4 flex flex-col flex-grow">
                <span className="text-[10px] text-[var(--color-primary)] uppercase tracking-widest font-bold mb-2">{product.category.name}</span>
                <Link href={`/products/${product.slug}`}>
                  <h3 className="text-sm md:text-base font-medium line-clamp-2 mb-3 group-hover:text-[var(--color-primary)] transition-colors">{product.name}</h3>
                </Link>
                <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/10">
                  <span className="text-lg font-heading tracking-wider">R$ {parseFloat(product.price).toFixed(2).replace('.', ',')}</span>
                  <Link href={`/products/${product.slug}`} className="text-xs uppercase tracking-widest font-bold text-gray-400 group-hover:text-[var(--color-primary)] transition-colors flex items-center gap-1">
                    Ver <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
