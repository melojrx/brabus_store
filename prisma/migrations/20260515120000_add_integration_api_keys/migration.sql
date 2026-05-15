-- CreateTable
CREATE TABLE "integration_api_keys" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "scopes" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "integration_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_audit_logs" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "payload" JSONB,
    "result" TEXT NOT NULL,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "integration_api_keys_keyHash_key" ON "integration_api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "integration_api_keys_actor_idx" ON "integration_api_keys"("actor");

-- CreateIndex
CREATE INDEX "integration_api_keys_active_idx" ON "integration_api_keys"("active");

-- CreateIndex
CREATE INDEX "integration_audit_logs_actor_createdAt_idx" ON "integration_audit_logs"("actor", "createdAt");

-- CreateIndex
CREATE INDEX "integration_audit_logs_resourceType_resourceId_idx" ON "integration_audit_logs"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "integration_audit_logs_action_createdAt_idx" ON "integration_audit_logs"("action", "createdAt");
