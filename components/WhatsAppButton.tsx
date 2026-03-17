"use client";

import { MessageCircle } from "lucide-react";

export default function WhatsAppButton() {
  const whatsappNumber = "5585997839040";
  const message = encodeURIComponent("Olá! Vi o site da Brabu's e tenho interesse em um produto.");
  const link = `https://wa.me/${whatsappNumber}?text=${message}`;

  return (
    <a 
      href={link} 
      target="_blank" 
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 bg-green-500 text-white p-4 rounded-full shadow-xl shadow-green-500/25 hover:bg-green-600 hover:-translate-y-1 transition-all duration-300 group"
      aria-label="Fale conosco no WhatsApp"
    >
      <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-30 group-hover:opacity-0 transition-opacity" />
      <MessageCircle className="w-7 h-7 relative z-10" />
    </a>
  );
}
