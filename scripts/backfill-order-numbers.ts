import { PrismaClient } from "@prisma/client"
import { backfillMissingOrderNumbers } from "../lib/order-number-service"

const prisma = new PrismaClient()

async function main() {
  const result = await backfillMissingOrderNumbers(prisma)

  console.log(
    `[order-number] pedidos sem codigo publico analisados: ${result.scanned}; atualizados: ${result.updated}`,
  )
}

main()
  .catch((error) => {
    console.error("[order-number] falha no backfill:", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
