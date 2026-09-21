ALTER TABLE "store_settings"
ALTER COLUMN "whatsapp" SET DEFAULT '5585921002688';

UPDATE "store_settings"
SET "whatsapp" = '5585921002688'
WHERE regexp_replace("whatsapp", '[^0-9]', '', 'g') IN ('5585997839040', '85997839040');
