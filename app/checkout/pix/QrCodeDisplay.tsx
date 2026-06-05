"use client"

import { useState } from "react"
import { Copy, Check, LoaderCircle } from "lucide-react"

type QrCodeDisplayProps = {
  qrCodeBase64: string | null
  qrCodeText: string
  amount: number
  onCopied?: () => void
}

function formatCurrency(value: number) {
  return `R$ ${value.toFixed(2).replace(".", ",")}`
}

export default function QrCodeDisplay({
  qrCodeBase64,
  qrCodeText,
  amount,
  onCopied,
}: QrCodeDisplayProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrCodeText)
      setCopied(true)
      onCopied?.()
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Erro ao copiar:", err)
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <div className="text-center">
        <p className="text-sm text-gray-400 uppercase tracking-widest mb-2">
          Valor a pagar
        </p>
        <p className="text-3xl font-heading text-[var(--color-primary)]">
          {formatCurrency(amount)}
        </p>
      </div>

      {qrCodeBase64 ? (
        <div className="bg-white p-4 rounded-sm">
          <img
            src={qrCodeBase64}
            alt="QR Code Pix"
            className="w-64 h-64 object-contain"
          />
        </div>
      ) : (
        <div className="w-64 h-64 bg-white/5 flex items-center justify-center rounded-sm">
          <LoaderCircle className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      )}

      <div className="text-center">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">
          Copie o codigo Pix
        </p>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-sm hover:border-white/30 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400">Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-white" />
              <span className="text-sm text-white">Copiar codigo</span>
            </>
          )}
        </button>
      </div>

      <p className="text-xs text-gray-500 text-center max-w-xs">
        Use o app do seu banco para escanear o QR code ou cole o codigo copiado.
        O pagamento sera confirmado automaticamente.
      </p>
    </div>
  )
}
