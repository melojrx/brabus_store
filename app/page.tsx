import Link from "next/link";
import { ArrowRight, Instagram } from "lucide-react";

async function getFeaturedProducts() {
  try {
    const res = await fetch(`${process.env.NEXTAUTH_URL}/api/products/featured`, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch (e) {
    return [];
  }
}

async function getInstagramFeed() {
  try {
    const res = await fetch(`${process.env.NEXTAUTH_URL}/api/instagram/feed`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    return res.json();
  } catch (e) {
    return [];
  }
}

export default async function Home() {
  const featuredProducts = await getFeaturedProducts();
  const instagramFeed = await getInstagramFeed();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[80vh] flex items-center bg-zinc-900 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent z-10" />
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50 grayscale"
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=2070&auto=format&fit=crop")' }}
        />
        
        <div className="container mx-auto px-4 relative z-20">
          <div className="max-w-2xl">
            <h1 className="text-5xl md:text-7xl font-heading tracking-wider text-white mb-6 uppercase">
              Para quem treina <span className="text-[var(--color-primary)]">de verdade</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-lg">
              Suplementação de alta performance e moda fitness premium. Entrega rápida para todo o Maciço de Baturité.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/products?type=SUPPLEMENT" className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-black font-bold uppercase tracking-widest py-4 px-8 rounded-sm transition-all text-center flex items-center justify-center gap-2">
                Suplementos <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/products?type=FASHION" className="glass hover:bg-white/10 text-white font-bold uppercase tracking-widest py-4 px-8 rounded-sm transition-all text-center flex items-center justify-center">
                Moda Fitness
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categorias em Destaque */}
      <section className="py-20 bg-background border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-heading tracking-wider uppercase">Encontre seu <span className="text-[var(--color-primary)]">Objetivo</span></h2>
              <div className="h-1 w-20 bg-[var(--color-primary)] mt-4"></div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/products?category=whey-protein" className="group relative h-64 overflow-hidden rounded-sm bg-zinc-900 border border-white/10">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
              <div className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:scale-105 group-hover:opacity-60 transition-all duration-500" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1593095948071-474c5cc2989d?q=80&w=2070&auto=format&fit=crop")' }} />
              <div className="absolute bottom-6 left-6 z-20">
                <h3 className="text-2xl font-heading tracking-wider uppercase text-white group-hover:text-[var(--color-primary)] transition-colors">Whey Protein</h3>
              </div>
            </Link>
            <Link href="/products?category=creatina" className="group relative h-64 overflow-hidden rounded-sm bg-zinc-900 border border-white/10">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
              <div className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:scale-105 group-hover:opacity-60 transition-all duration-500" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1554284126-aa88f22d8b74?q=80&w=2127&auto=format&fit=crop")' }} />
              <div className="absolute bottom-6 left-6 z-20">
                <h3 className="text-2xl font-heading tracking-wider uppercase text-white group-hover:text-[var(--color-primary)] transition-colors">Creatina</h3>
              </div>
            </Link>
            <Link href="/products?type=FASHION" className="group relative h-64 overflow-hidden rounded-sm bg-zinc-900 border border-white/10">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
              <div className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:scale-105 group-hover:opacity-60 transition-all duration-500" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1571731956672-f2b94d7dd0cb?q=80&w=2127&auto=format&fit=crop")' }} />
              <div className="absolute bottom-6 left-6 z-20">
                <h3 className="text-2xl font-heading tracking-wider uppercase text-white group-hover:text-[var(--color-primary)] transition-colors">Moda Fitness</h3>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Produtos em Destaque */}
      <section className="py-20 bg-surface border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-heading tracking-wider uppercase">Mais <span className="text-[var(--color-secondary)]">Vendidos</span></h2>
              <div className="h-1 w-20 bg-[var(--color-secondary)] mt-4"></div>
            </div>
            <Link href="/products" className="hidden md:flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors uppercase tracking-widest font-bold">
              Ver Todos <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {featuredProducts.map((product: any) => (
              <div key={product.id} className="group flex flex-col glass rounded-sm overflow-hidden border border-white/5 hover:border-white/20 transition-all">
                <Link href={`/products/${product.slug}`} className="relative aspect-square overflow-hidden bg-white/5 flex items-center justify-center p-4">
                  {product.stock === 0 ? (
                    <span className="absolute top-2 left-2 bg-[var(--color-secondary)] text-white text-[10px] uppercase font-bold px-2 py-1 tracking-wider z-10 rounded-sm">Esgotado</span>
                  ) : product.stock < 10 ? (
                    <span className="absolute top-2 left-2 bg-yellow-600 text-white text-[10px] uppercase font-bold px-2 py-1 tracking-wider z-10 rounded-sm">Últimas Unidades</span>
                  ) : product.isNew && (
                    <span className="absolute top-2 left-2 bg-[var(--color-primary)] text-black text-[10px] uppercase font-bold px-2 py-1 tracking-wider z-10 rounded-sm">Novo</span>
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={product.images[0] || "/placeholder.jpg"} 
                    alt={product.name} 
                    className="object-contain w-full h-full group-hover:scale-110 transition-transform duration-500"
                  />
                </Link>
                <div className="p-4 flex flex-col flex-grow">
                  <span className="text-xs text-[var(--color-primary)] uppercase tracking-wider font-bold mb-1">{product.category.name}</span>
                  <Link href={`/products/${product.slug}`}>
                    <h3 className="text-sm md:text-base font-medium line-clamp-2 mb-2 group-hover:text-[var(--color-primary)] transition-colors">{product.name}</h3>
                  </Link>
                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-lg md:text-xl font-heading tracking-wider">R$ {parseFloat(product.price).toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>
              </div>
            ))}
            
            {featuredProducts.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-500 border border-white/10 border-dashed rounded-sm">
                Nenhum produto em destaque no momento.
              </div>
            )}
          </div>
          
          <div className="mt-8 md:hidden flex justify-center">
            <Link href="/products" className="flex items-center gap-2 text-sm text-white hover:text-[var(--color-primary)] transition-colors uppercase tracking-widest font-bold border border-white/20 px-6 py-3 rounded-sm">
              Ver Todos <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Instagram Feed */}
      <section className="py-20 bg-black border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Instagram className="w-10 h-10 mx-auto text-[var(--color-primary)] mb-4" />
            <h2 className="text-3xl md:text-4xl font-heading tracking-wider uppercase mb-2">Siga a <span className="text-white">@brabus.performancestore</span></h2>
            <p className="text-gray-400 mt-2">Marque a gente no seu treino 💀🔥</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {instagramFeed.slice(0, 6).map((post: any) => (
              <a key={post.id} href={post.permalink} target="_blank" rel="noopener noreferrer" className="relative aspect-square group overflow-hidden block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.media_url} alt="Instagram post" className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500 grayscale group-hover:grayscale-0" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Instagram className="text-white w-8 h-8" />
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
