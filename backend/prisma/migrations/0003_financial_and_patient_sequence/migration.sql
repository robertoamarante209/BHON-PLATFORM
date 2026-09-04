-- BHON: deterministic patient record numbering and explicit financial transaction linkage.
ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "patient_record_sequence" INTEGER NOT NULL DEFAULT 0;

UPDATE "tenants" t
SET "patient_record_sequence" = COALESCE(
  (
    SELECT MAX(CAST(regexp_replace(p."record_number", '[^0-9]', '', 'g') AS INTEGER))
    FROM "patients" p
    WHERE p."tenant_id" = t."id"
      AND p."record_number" IS NOT NULL
      AND regexp_replace(p."record_number", '[^0-9]', '', 'g') <> ''
  ),
  0
);

ALTER TABLE "financial_transactions"
  ADD COLUMN IF NOT EXISTS "payment_id" TEXT,
  ADD COLUMN IF NOT EXISTS "patient_id" TEXT,
  ADD COLUMN IF NOT EXISTS "treatment_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "financial_transactions_payment_id_key"
  ON "financial_transactions"("payment_id")
  WHERE "payment_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "financial_transactions_tenant_id_patient_id_idx"
  ON "financial_transactions"("tenant_id", "patient_id");

CREATE INDEX IF NOT EXISTS "financial_transactions_tenant_id_treatment_id_idx"
  ON "financial_transactions"("tenant_id", "treatment_id");

DO $$ BEGIN
  ALTER TABLE "financial_transactions"
    ADD CONSTRAINT "financial_transactions_payment_id_fkey"
    FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "financial_transactions"
    ADD CONSTRAINT "financial_transactions_patient_id_fkey"
    FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "financial_transactions"
    ADD CONSTRAINT "financial_transactions_treatment_id_fkey"
    FOREIGN KEY ("treatment_id") REFERENCES "treatments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
