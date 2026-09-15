CREATE TABLE "clinic_availability" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "professional_id" TEXT,
  "scope_key" TEXT NOT NULL,
  "intervals" JSONB NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "clinic_availability_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "clinic_availability_tenant_id_scope_key_key" UNIQUE ("tenant_id", "scope_key"),
  CONSTRAINT "clinic_availability_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "clinic_availability_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "clinic_availability_tenant_id_professional_id_idx" ON "clinic_availability"("tenant_id", "professional_id");

ALTER TABLE "clinic_availability" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "clinic_availability" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "clinic_availability" FROM authenticated;
  END IF;
END $$;

CREATE TABLE "clinic_protocols" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "steps" JSONB NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "clinic_protocols_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "clinic_protocols_tenant_id_title_key" UNIQUE ("tenant_id", "title"),
  CONSTRAINT "clinic_protocols_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "clinic_protocols_tenant_id_is_active_idx" ON "clinic_protocols"("tenant_id", "is_active");
ALTER TABLE "clinic_protocols" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "clinic_protocols" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "clinic_protocols" FROM authenticated;
  END IF;
END $$;
