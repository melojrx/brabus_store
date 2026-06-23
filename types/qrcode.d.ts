declare module "qrcode" {
  type QRCodeColorOptions = {
    dark?: string
    light?: string
  }

  type QRCodeToDataURLOptions = {
    width?: number
    margin?: number
    color?: QRCodeColorOptions
  }

  const QRCode: {
    toDataURL(text: string, options?: QRCodeToDataURLOptions): Promise<string>
  }

  export default QRCode
}
