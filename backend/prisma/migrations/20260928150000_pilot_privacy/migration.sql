CREATE TYPE "ContactChannelStatus" AS ENUM ('NOT_INFORMED', 'ALLOWED', 'REFUSED');
CREATE TYPE "PrivacyRequestType" AS ENUM ('ACCESS', 'CORRECTION', 'EXPORT', 'DELETION', 'OTHER');
CREATE TYPE "PrivacyRequestStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');
CREATE TYPE "PrivacyIncidentStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'CONTAINED', 'CLOSED');

CREATE TABLE "patient_contact_preferences" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "patient_id" TEXT NOT NULL,
  "whatsapp" "ContactChannelStatus" NOT NULL DEFAULT 'NOT_INFORMED',
  "phone" "ContactChannelStatus" NOT NULL DEFAULT 'NOT_INFORMED',
  "email" "ContactChannelStatus" NOT NULL DEFAULT 'NOT_INFORMED',
  "source" TEXT,
  "recorded_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "recorded_by_user_id" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "patient_contact_preferences_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "patient_contact_preferences_patient_id_key" UNIQUE ("patient_id"),
  CONSTRAINT "patient_contact_preferences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "patient_contact_preferences_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "privacy_requests" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "patient_id" TEXT,
  "type" "PrivacyRequestType" NOT NULL,
  "status" "PrivacyRequestStatus" NOT NULL DEFAULT 'OPEN',
  "summary" TEXT NOT NULL,
  "due_at" TIMESTAMPTZ(3),
  "created_by_user_id" TEXT,
  "responsible_user_id" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "privacy_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "privacy_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "privacy_requests_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "privacy_requests_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "privacy_requests_responsible_user_id_fkey" FOREIGN KEY ("responsible_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "privacy_incidents" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "status" "PrivacyIncidentStatus" NOT NULL DEFAULT 'OPEN',
  "system_area" TEXT NOT NULL,
  "impact_level" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "actions_taken" TEXT,
  "created_by_user_id" TEXT,
  "responsible_user_id" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "privacy_incidents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "privacy_incidents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "privacy_incidents_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "privacy_incidents_responsible_user_id_fkey" FOREIGN KEY ("responsible_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "patient_contact_preferences_tenant_id_patient_id_idx" ON "patient_contact_preferences"("tenant_id", "patient_id");
CREATE INDEX "privacy_requests_tenant_id_status_created_at_idx" ON "privacy_requests"("tenant_id", "status", "created_at");
CREATE INDEX "privacy_requests_tenant_id_patient_id_idx" ON "privacy_requests"("tenant_id", "patient_id");
CREATE INDEX "privacy_incidents_tenant_id_status_created_at_idx" ON "privacy_incidents"("tenant_id", "status", "created_at");

ALTER TABLE "patient_contact_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "privacy_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "privacy_incidents" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "patient_contact_preferences", "privacy_requests", "privacy_incidents" FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "patient_contact_preferences", "privacy_requests", "privacy_incidents" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "patient_contact_preferences", "privacy_requests", "privacy_incidents" FROM authenticated;
  END IF;
END $$;
