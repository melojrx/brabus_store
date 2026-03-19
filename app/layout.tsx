import type { Metadata } from "next"
import { Inter, Bebas_Neue } from "next/font/google"
import "./globals.css"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import WhatsAppButton from "@/components/WhatsAppButton"
import Providers from "@/components/Providers"

export const dynamic = "force-dynamic"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const bebasNeue = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-bebas-neue" })

export const metadata: Metadata = {
  metadataBase: new URL("https://brabustore.com.br"),
  title: {
    default: "Brabu's Performance Store",
    template: "%s | Brabu's Performance Store",
  },
  description: "Para quem treina de verdade. Suplementação e moda fitness premium em Aracoiaba, CE.",
  keywords: ["suplementos", "moda fitness", "whey protein", "creatina", "Aracoiaba", "Ceará"],
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
