import manifest from "@/docs/brand/vitrine-assets-manifest.json"

// Review status and source provenance stay in the asset manifest.
export const brandAssets = {
  horizontal: manifest["logo-horizontal"],
  emblem: manifest["emblema-principal"],
  hero: manifest["hero-integrada"],
  atmosphere: manifest["hero-atmosfera"],
  compact: manifest["simbolo-compacto"],
}

export const objectiveArtwork: Record<string, {
  title: string
  description: string
  alt: string
  image: typeof manifest["categoria-masculina"]
}> = {
  "roupas-fitness": {
    title: "Moda masculina",
    description: "Peças masculinas para treino e dia a dia.",
    alt: "Regatas masculinas e bermuda Brabu’s em tons preto e areia",
    image: manifest["categoria-masculina"],
  },
  acessorios: {
    title: "Acessórios",
    description: "Bonés e acessórios para acompanhar sua rotina.",
    alt: "Bonés Brabu’s preto e azul-marinho",
    image: manifest["categoria-acessorios"],
  },
  suplementos: {
    title: "Suplementos",
    description: "Explore os suplementos disponíveis no catálogo.",
    alt: "Composição ilustrativa de suplementos em diferentes formatos de embalagem",
    image: manifest["categoria-suplementos"],
  },
}
