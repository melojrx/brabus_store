import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Brabu's Performance Store",
    short_name: "Brabu's",
    description: "Para quem treina de verdade. Suplementação e moda fitness premium em Aracoiaba, CE.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0A0A0A",
    theme_color: "#0A0A0A",
    lang: "pt-BR",
    categories: ["shopping", "health", "lifestyle"],
    icons: [
      {
        src: "/pwa-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/pwa-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/pwa-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
