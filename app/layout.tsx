import type { Metadata, Viewport } from "next"
import { Inter, Bebas_Neue } from "next/font/google"
import "./globals.css"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import WhatsAppButton from "@/components/WhatsAppButton"
import Providers from "@/components/Providers"
import PwaRegistration from "@/components/PwaRegistration"

export const dynamic = "force-dynamic"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const bebasNeue = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-bebas-neue" })

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  colorScheme: "dark",
}

export const metadata: Metadata = {
  metadataBase: new URL("https://brabustore.com.br"),
  applicationName: "Brabu's Performance Store",
  manifest: "/manifest.webmanifest",
  title: {
    default: "Brabu's Performance Store",
    template: "%s | Brabu's Performance Store",
  },
  description: "Para quem treina de verdade. Suplementação e moda fitness premium em Aracoiaba, CE.",
  keywords: ["suplementos", "moda fitness", "whey protein", "creatina", "Aracoiaba", "Ceará"],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Brabu's Store",
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: [{ url: "/favicon-32x32.png", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://brabustore.com.br",
    siteName: "Brabu's Performance Store",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${bebasNeue.variable} dark`}>
      <body className="font-body bg-background text-foreground min-h-screen flex flex-col">
        <Providers>
          <PwaRegistration />
          <Navbar />
          <main className="flex-grow">
            {children}
          </main>
          <Footer />
          <WhatsAppButton />
        </Providers>
      </body>
    </html>
  )
}
