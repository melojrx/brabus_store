import sharp from "sharp"
import { copyFile } from "node:fs/promises"

// Artwork is derived with image_gen; this script only sizes and pads it.
const source = "public/brand/icons/caveira-master.png"
const base = "public/brand/icons/brabus-g10"
for (const size of [16, 32, 180, 192, 512]) {
  const icon = await sharp(source).trim().resize(Math.round(size * 0.9), Math.round(size * 0.9), { fit: "inside" }).png().toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background: size <= 32 ? "#00000000" : "#0A0A0A" } })
    .composite([{ input: icon, gravity: "centre" }]).png().toFile(`${base}-${size}.png`)
}
// A 56% square fits fully inside the central 80%-diameter safe circle.
const maskable = await sharp(source).trim().resize(286, 286, { fit: "inside" }).png().toBuffer()
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#0A0A0A" } })
  .composite([{ input: maskable, gravity: "centre" }]).png().toFile(`${base}-maskable-512.png`)
// Keep old direct URLs consistent for bookmarks/clients that still request them.
for (const [file, variant] of Object.entries({
  "favicon.png": "512", "favicon-32x32.png": "32", "apple-touch-icon.png": "180",
  "pwa-192x192.png": "192", "pwa-512x512.png": "512", "pwa-maskable-512x512.png": "maskable-512",
})) await copyFile(`${base}-${variant}.png`, `public/${file}`)
