-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "cpf" TEXT,
    "cnpj" TEXT,
    "personType" TEXT,
    "stateRegistration" TEXT,
    "addressStreet" TEXT,
    "addressNumber" TEXT,
    "addressComplement" TEXT,
    "addressNeighborhood" TEXT,
    "addressCity" TEXT,
    "addressState" TEXT,
    "addressZip" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sellers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "cpf" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sellers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "cpf" TEXT,
    "cnpj" TEXT,
    "personType" TEXT,
    "stateRegistration" TEXT,
    "contactName" TEXT,
    "addressStreet" TEXT,
    "addressNumber" TEXT,
    "addressComplement" TEXT,
    "addressNeighborhood" TEXT,
    "addressCity" TEXT,
    "addressState" TEXT,
    "addressZip" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customers_cpf_key" ON "customers"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "customers_cnpj_key" ON "customers"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "customers_userId_key" ON "customers"("userId");

-- CreateIndex
CREATE INDEX "customers_email_idx" ON "customers"("email");

-- CreateIndex
CREATE INDEX "customers_phone_idx" ON "customers"("phone");

-- CreateIndex
CREATE INDEX "customers_personType_idx" ON "customers"("personType");

-- CreateIndex
CREATE UNIQUE INDEX "sellers_cpf_key" ON "sellers"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_cpf_key" ON "suppliers"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_cnpj_key" ON "suppliers"("cnpj");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DataMigration: create Customer for each existing User with role CUSTOMER
INSERT INTO "customers" ("id", "name", "email", "phone", "addressStreet", "addressNumber",
  "addressComplement", "addressNeighborhood", "addressCity", "addressState", "addressZip",
  "userId", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  "name",
  "email",
  "phone",
  "addressStreet",
  "addressNumber",
  "addressComplement",
  "addressNeighborhood",
  "addressCity",
  "addressState",
  "addressZip",
  "id",
  "createdAt",
  NOW()
FROM "users"
WHERE "role" = 'CUSTOMER';
