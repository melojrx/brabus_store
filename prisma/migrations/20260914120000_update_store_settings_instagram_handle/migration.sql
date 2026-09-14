ALTER TABLE "store_settings"
ALTER COLUMN "instagram" SET DEFAULT '@brabus_performancestore';

UPDATE "store_settings"
SET "instagram" = '@brabus_performancestore'
WHERE "instagram" = '@brabus_pstore';
