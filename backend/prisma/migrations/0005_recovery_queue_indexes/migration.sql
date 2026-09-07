-- Align the persisted opportunity workflow with the current domain model before
-- creating Recovery Engine indexes. This migration preserves legacy records.
ALTER TYPE "TenantStatus" ADD VALUE IF NOT EXISTS 'TEST';
ALTER TYPE "TenantStatus" ADD VALUE IF NOT EXISTS 'PAYMENT_PENDING';

ALTER TYPE "TreatmentStatus" ADD VALUE IF NOT EXISTS 'ACTIVE';
ALTER TYPE "TreatmentStatus" ADD VALUE IF NOT EXISTS 'RISK_OF_ABANDONMENT';

ALTER TYPE "OpportunityType" ADD VALUE IF NOT EXISTS 'NEW_CONTACT';

ALTER TYPE "OpportunityStatus" RENAME TO "OpportunityStatus_legacy";
CREATE TYPE "OpportunityStatus" AS ENUM (
  'NEW_CONTACT',
  'TRIAGEM',
  'AVALIACAO',
  'PLANO_APRESENTADO',
  'ORCAMENTO',
  'NEGOCIACAO',
  'CONVERTIDO',
  'PERDIDO'
);

ALTER TABLE "opportunities" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "opportunities"
  ALTER COLUMN "status" TYPE "OpportunityStatus"
  USING (
    CASE "status"::text
      WHEN 'NEW' THEN 'NEW_CONTACT'
      WHEN 'IN_PROGRESS' THEN 'TRIAGEM'
      WHEN 'WAITING' THEN 'NEGOCIACAO'
      WHEN 'CONVERTED' THEN 'CONVERTIDO'
      WHEN 'LOST' THEN 'PERDIDO'
      WHEN 'DISMISSED' THEN 'PERDIDO'
      ELSE 'TRIAGEM'
    END
  )::"OpportunityStatus";
ALTER TABLE "opportunities" ALTER COLUMN "status" SET DEFAULT 'TRIAGEM';
DROP TYPE "OpportunityStatus_legacy";

ALTER TABLE "opportunities"
  ADD COLUMN IF NOT EXISTS "source" TEXT,
  ADD COLUMN IF NOT EXISTS "potential_value" DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS "days_inactive" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "next_step" TEXT,
  ADD COLUMN IF NOT EXISTS "last_contact_at" TIMESTAMPTZ(3);

UPDATE "opportunities"
SET
  "potential_value" = COALESCE("potential_value", "estimated_value"),
  "next_step" = COALESCE("next_step", "next_action", "reason"),
  "last_contact_at" = COALESCE("last_contact_at", "next_action_at");

UPDATE "treatments"
SET "total_value" = COALESCE("total_value", "value");

ALTER TABLE "opportunities"
  DROP COLUMN IF EXISTS "estimated_value",
  DROP COLUMN IF EXISTS "next_action",
  DROP COLUMN IF EXISTS "next_action_at",
  DROP COLUMN IF EXISTS "reason";

ALTER TABLE "treatments" DROP COLUMN IF EXISTS "value";

-- Composite indexes for the tenant-scoped Recovery Engine queue.
CREATE INDEX IF NOT EXISTS "treatments_tenant_id_status_updated_at_idx"
  ON "treatments"("tenant_id", "status", "updated_at");

CREATE INDEX IF NOT EXISTS "quotes_tenant_id_status_updated_at_idx"
  ON "quotes"("tenant_id", "status", "updated_at");

CREATE INDEX IF NOT EXISTS "opportunities_tenant_id_status_updated_at_idx"
  ON "opportunities"("tenant_id", "status", "updated_at");

CREATE INDEX IF NOT EXISTS "opportunities_tenant_id_days_inactive_idx"
  ON "opportunities"("tenant_id", "days_inactive");

CREATE INDEX IF NOT EXISTS "follow_ups_tenant_id_status_deadline_at_idx"
  ON "follow_ups"("tenant_id", "status", "deadline_at");

CREATE INDEX IF NOT EXISTS "payments_tenant_id_status_due_date_idx"
  ON "payments"("tenant_id", "status", "due_date");

