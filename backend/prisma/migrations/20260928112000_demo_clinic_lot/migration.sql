CREATE TABLE IF NOT EXISTS "demo_data_lots" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "created_by_user_id" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "demo_data_lots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "demo_data_lots_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "demo_data_lots_tenant_id_created_at_idx"
  ON "demo_data_lots"("tenant_id", "created_at");

ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "demo_lot_id" TEXT;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "demo_lot_id" TEXT;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "demo_lot_id" TEXT;
ALTER TABLE "follow_ups" ADD COLUMN IF NOT EXISTS "demo_lot_id" TEXT;

DO $$ BEGIN
  ALTER TABLE "patients" ADD CONSTRAINT "patients_demo_lot_id_fkey"
    FOREIGN KEY ("demo_lot_id") REFERENCES "demo_data_lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_demo_lot_id_fkey"
    FOREIGN KEY ("demo_lot_id") REFERENCES "demo_data_lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "appointments" ADD CONSTRAINT "appointments_demo_lot_id_fkey"
    FOREIGN KEY ("demo_lot_id") REFERENCES "demo_data_lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_demo_lot_id_fkey"
    FOREIGN KEY ("demo_lot_id") REFERENCES "demo_data_lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "patients_demo_lot_id_idx" ON "patients"("demo_lot_id");
CREATE INDEX IF NOT EXISTS "opportunities_demo_lot_id_idx" ON "opportunities"("demo_lot_id");
CREATE INDEX IF NOT EXISTS "appointments_demo_lot_id_idx" ON "appointments"("demo_lot_id");
CREATE INDEX IF NOT EXISTS "follow_ups_demo_lot_id_idx" ON "follow_ups"("demo_lot_id");

ALTER TABLE "demo_data_lots" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "demo_data_lots" FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "demo_data_lots" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "demo_data_lots" FROM authenticated;
  END IF;
END $$;
