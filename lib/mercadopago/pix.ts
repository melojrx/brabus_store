import QRCode from "qrcode"
import type { MercadoPagoPixQrCode } from "./types"

export async function generateQrCodeBase64(qrCodeText: string): Promise<string> {
  const base64 = await QRCode.toDataURL(qrCodeText, {
    width: 300,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  })
  return base64
}

export function formatPixCopyText(
  paymentId: string,
  amount: number,
  merchantName: string,
): string {
  // Formato EMV Pix (versão simplificada)
  const formattedAmount = amount.toFixed(2)
  return `${paymentId}|${formattedAmount}|${merchantName}`
}

export interface PixPaymentData {
  qrCode: string
  qrCodeBase64: string
  paymentId: string
}