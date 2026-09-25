ALTER TABLE "trial_signups" ADD COLUMN IF NOT EXISTS "clinic_phone" TEXT;
ALTER TABLE "trial_signups" ADD COLUMN IF NOT EXISTS "owner_phone" TEXT;

-- Preserva os cadastros já iniciados: o número antigo continua disponível
-- até que cada clínica informe os dois contatos separadamente.
UPDATE "trial_signups"
SET "clinic_phone" = "phone"
WHERE "clinic_phone" IS NULL AND "phone" IS NOT NULL;

UPDATE "trial_signups"
SET "owner_phone" = "phone"
WHERE "owner_phone" IS NULL AND "phone" IS NOT NULL;
