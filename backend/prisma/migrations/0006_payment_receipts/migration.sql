-- BHON: auditable partial/full receipts for clinic accounts receivable.
ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "paid_amount" DECIMAL(12, 2) NOT NULL DEFAULT 0;

UPDATE "payments"
SET "paid_amount" = "amount"
WHERE "status" = 'PAGO' AND "paid_amount" = 0;

DO $$ BEGIN
  ALTER TABLE "payments"
    ADD CONSTRAINT "payments_paid_amount_bounds"
    CHECK ("paid_amount" >= 0 AND "paid_amount" <= "amount");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "payment_receipts" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "payment_id" TEXT NOT NULL,
  "received_by_id" TEXT NOT NULL,
  "amount" DECIMAL(12, 2) NOT NULL,
  "method" TEXT NOT NULL,
  "paid_at" TIMESTAMPTZ(3) NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_receipts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_receipts_positive_amount" CHECK ("amount" > 0)
);

CREATE INDEX IF NOT EXISTS "payment_receipts_tenant_id_paid_at_idx"
  ON "payment_receipts"("tenant_id", "paid_at");
CREATE INDEX IF NOT EXISTS "payment_receipts_tenant_id_payment_id_idx"
  ON "payment_receipts"("tenant_id", "payment_id");
CREATE INDEX IF NOT EXISTS "payment_receipts_tenant_id_received_by_id_idx"
  ON "payment_receipts"("tenant_id", "received_by_id");

DO $$ BEGIN
  ALTER TABLE "payment_receipts"
    ADD CONSTRAINT "payment_receipts_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "payment_receipts"
    ADD CONSTRAINT "payment_receipts_payment_id_fkey"
    FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "payment_receipts"
    ADD CONSTRAINT "payment_receipts_received_by_id_fkey"
    FOREIGN KEY ("received_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

