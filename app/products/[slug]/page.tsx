import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";

async function getProduct(slug: string) {
  try {
    const res = await fetch(`${process.env.NEXTAUTH_URL}/api/products/${slug}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch (e) {
    return null;
  }
}

export default async function ProductDetail({ params }: { params: { slug: string } }) {
  const resolvedParams = await params
  const product = await getProduct(resolvedParams.slug);

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-heading mb-4">Produto não encontrado</h1>
        <Link href="/products" className="text-[var(--color-primary)] hover:underline">Voltar para a loja</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 lg:py-20">
      <Link href="/products" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors uppercase tracking-widest text-xs font-bold mb-8">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="glass p-8 rounded-sm border border-white/5 flex items-center justify-center relative bg-white/5 aspect-square">
          {product.stock === 0 && (
            <span className="absolute top-4 left-4 bg-[var(--color-secondary)] text-white text-xs uppercase font-bold px-3 py-1 tracking-wider z-10 rounded-sm">Esgotado</span>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={product.images[0] || "/placeholder.jpg"} 
            alt={product.name} 
            className="w-full h-full object-contain"
          />
        </div>

        <div className="flex flex-col">
          <span className="text-sm text-[var(--color-primary)] uppercase font-bold tracking-widest mb-2">{product.category.name}</span>
          <h1 className="text-3xl md:text-5xl font-heading tracking-wider mb-4 uppercase">{product.name}</h1>
          <p className="text-gray-400 mb-8 max-w-lg leading-relaxed">{product.description}</p>
          
          <div className="text-4xl md:text-5xl font-heading tracking-wider mb-8 text-white">
            R$ {parseFloat(product.price).toFixed(2).replace('.', ',')}
          </div>

          <div className="space-y-6 mb-10">
            {product.flavors && product.flavors.length > 0 && (
               <div>
                  <h3 className="text-xs uppercase text-gray-400 font-bold mb-3 tracking-widest">Selecione o Sabor</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.flavors.map((flavor: string) => (
                      <button key={flavor} className="border border-white/20 hover:border-white/50 bg-white/5 px-4 py-2 text-sm transition-colors rounded-sm uppercase tracking-wide">
                        {flavor}
                      </button>
                    ))}
                  </div>
               </div>
            )}

            {product.sizes && product.sizes.length > 0 && (
               <div>
                  <h3 className="text-xs uppercase text-gray-400 font-bold mb-3 tracking-widest">Tamanho</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((size: string) => (
                      <button key={size} className="border border-white/20 hover:border-white/50 bg-white/5 w-12 h-12 flex items-center justify-center text-sm transition-colors rounded-sm font-bold">
                        {size}
                      </button>
                    ))}
                  </div>
               </div>
            )}
          </div>

          {product.stock > 0 ? (
            <button className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-black font-bold uppercase tracking-widest py-4 px-8 rounded-sm transition-all flex items-center justify-center gap-2 w-full md:w-auto">
              <ShoppingBag className="w-5 h-5" /> Adicionar ao Carrinho
            </button>
          ) : (
             <button disabled className="bg-zinc-800 text-gray-500 font-bold uppercase tracking-widest py-4 px-8 rounded-sm flex items-center justify-center gap-2 w-full md:w-auto cursor-not-allowed">
               <ShoppingBag className="w-5 h-5" /> Esgotado
             </button>
          )}

          <div className="mt-8 pt-8 border-t border-white/10 text-sm text-gray-400 space-y-2">
            <p><strong>Estoque:</strong> {product.stock > 0 ? `${product.stock} unidades disponíveis` : 'Indisponível'}</p>
            {product.weight && <p><strong>Peso/Volume:</strong> {product.weight}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
