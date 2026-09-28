DO $$ BEGIN
  CREATE TYPE "ActivationEventType" AS ENUM (
    'ONBOARDING_OPENED',
    'CSV_TEMPLATE_DOWNLOADED',
    'PATIENT_IMPORT_COMPLETED',
    'DEMO_LOADED',
    'DEMO_REMOVED',
    'TEAM_CREATED',
    'AGENDA_OPENED',
    'OPPORTUNITY_PRIORITIZED',
    'SARAH_MESSAGE_PREPARED'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "onboarding_progress"
  ADD COLUMN IF NOT EXISTS "dismissed_at" TIMESTAMPTZ(3);

CREATE TABLE IF NOT EXISTS "activation_events" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "actor_user_id" TEXT,
  "type" "ActivationEventType" NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "activation_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "activation_events_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "activation_events_tenant_id_created_at_idx"
  ON "activation_events"("tenant_id", "created_at");

ALTER TABLE "activation_events" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "activation_events" FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "activation_events" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "activation_events" FROM authenticated;
  END IF;
END $$;
