import { Mail, MessageCircle, Send } from "lucide-react";

export default function Contato() {
  return (
    <div className="container mx-auto px-4 py-12 lg:py-20">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <h1 className="text-4xl md:text-5xl font-heading tracking-wider uppercase mb-4">Fale <span className="text-[var(--color-primary)]">Conosco</span></h1>
        <p className="text-gray-400">Dúvidas sobre produtos, pedidos ou parcerias? Entre em contato e responderemos o mais rápido possível.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
        
        {/* Formulário */}
        <div className="lg:col-span-3 glass p-8 rounded-sm border border-white/5">
          <h2 className="text-2xl font-heading tracking-wider uppercase mb-6">Envie uma Mensagem</h2>
          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="name" className="text-xs font-bold uppercase tracking-widest text-gray-400">Nome</label>
                <input type="text" id="name" className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:border-[var(--color-primary)] focus:outline-none transition-colors" placeholder="Seu nome completo" />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-gray-400">E-mail</label>
                <input type="email" id="email" className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:border-[var(--color-primary)] focus:outline-none transition-colors" placeholder="seu@email.com" />
              </div>
            </div>
            
            <div className="space-y-2">
               <label htmlFor="subject" className="text-xs font-bold uppercase tracking-widest text-gray-400">Assunto</label>
               <select id="subject" className="w-full bg-zinc-900 border border-white/10 rounded-sm p-3 text-white focus:border-[var(--color-primary)] focus:outline-none transition-colors">
                 <option value="Duvida">Dúvida Geral</option>
                 <option value="Pedido">Meu Pedido</option>
                 <option value="Suporte">Suporte e Devoluções</option>
                 <option value="Parceria">Parcerias de Atletas</option>
               </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="message" className="text-xs font-bold uppercase tracking-widest text-gray-400">Mensagem</label>
              <textarea id="message" rows={5} className="w-full bg-white/5 border border-white/10 rounded-sm p-3 text-white focus:border-[var(--color-primary)] focus:outline-none transition-colors" placeholder="Como podemos te ajudar?"></textarea>
            </div>

            <button type="button" className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-black font-bold uppercase tracking-widest py-4 px-8 rounded-sm transition-all flex items-center justify-center gap-2 w-full">
              <Send className="w-5 h-5" /> Enviar Mensagem
            </button>
          </form>
        </div>

        {/* Formas Diretas */}
        <div className="lg:col-span-2 space-y-8">
           <div className="glass p-8 rounded-sm border border-white/5">
             <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
                <MessageCircle className="w-6 h-6 text-green-500" />
             </div>
             <h3 className="text-xl font-heading tracking-wider uppercase mb-2">Atendimento Rápido</h3>
             <p className="text-gray-400 text-sm mb-6">A forma mais rápida de falar com a nossa equipe de vendas e suporte é pelo WhatsApp.</p>
             <a href="https://wa.me/5585997839040" target="_blank" rel="noopener noreferrer" className="block w-full text-center bg-green-500 hover:bg-green-600 text-white font-bold uppercase tracking-widest py-4 rounded-sm transition-all">
               Falar no WhatsApp
             </a>
           </div>

           <div className="glass p-8 rounded-sm border border-white/5">
             <div className="w-12 h-12 bg-[var(--color-primary)]/10 rounded-full flex items-center justify-center mb-6">
                <Mail className="w-6 h-6 text-[var(--color-primary)]" />
             </div>
             <h3 className="text-xl font-heading tracking-wider uppercase mb-2">E-mail Direto</h3>
             <p className="text-gray-400 text-sm mb-6">Envie um e-mail direto para nossa equipe corporativa para grandes volumes ou parcerias.</p>
             <a href="mailto:contato@brabusstore.com" className="block w-full text-center border border-white/20 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] text-white font-bold uppercase tracking-widest py-4 rounded-sm transition-all">
               contato@brabusstore.com
             </a>
           </div>
        </div>

      </div>
    </div>
  );
}
