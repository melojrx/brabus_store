console.log(
  [
    "The phase 2 backfill script is obsolete after the final catalog cleanup.",
    "This project now expects products to live in subcategories and to use ProductVariant as the only stock source.",
    "Use `npx tsx prisma/seed.ts` to recreate the development data with the current schema.",
  ].join(" "),
)
