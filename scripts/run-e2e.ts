import { spawnSync } from "node:child_process"

const databaseUrl = process.env.DATABASE_URL_E2E
const npx = process.platform === "win32" ? "npx.cmd" : "npx"

if (!databaseUrl) {
  throw new Error("DATABASE_URL_E2E é obrigatória para executar os testes de navegador.")
}

const databaseName = new URL(databaseUrl).pathname.replace(/^\//, "")

if (!databaseName.endsWith("_e2e")) {
  throw new Error("DATABASE_URL_E2E deve apontar para um banco cujo nome termina em _e2e.")
}

const env = {
  ...process.env,
  AUTH_TRUST_HOST: "true",
  DATABASE_URL: databaseUrl,
  NEXTAUTH_URL: "http://127.0.0.1:3100",
}

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, { env, stdio: "inherit" })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

run(npx, ["prisma", "migrate", "deploy"])
run(npx, ["prisma", "db", "seed"])
run(npx, ["playwright", "test", ...process.argv.slice(2)])
