CREATE TABLE IF NOT EXISTS "inventory_items" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sku" TEXT,
  "category" TEXT,
  "unit" TEXT NOT NULL DEFAULT 'un',
  "current_stock" DECIMAL(12,3) NOT NULL DEFAULT 0,
  "minimum_stock" DECIMAL(12,3) NOT NULL DEFAULT 0,
  "unit_cost" DECIMAL(12,2),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "inventory_movements" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "item_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "quantity" DECIMAL(12,3) NOT NULL,
  "reason" TEXT,
  "actor_user_id" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_movements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "inventory_movements_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "clinic_documents" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "patient_id" TEXT,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "mime_type" TEXT,
  "created_by_id" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "clinic_documents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "clinic_documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "clinic_documents_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "integration_connections" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "display_name" TEXT,
  "status" TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
  "configuration" JSONB,
  "last_synced_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "integration_connections_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "integration_connections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_items_tenant_id_sku_key" ON "inventory_items"("tenant_id", "sku");
CREATE INDEX IF NOT EXISTS "inventory_items_tenant_id_is_active_idx" ON "inventory_items"("tenant_id", "is_active");
CREATE INDEX IF NOT EXISTS "inventory_items_tenant_id_name_idx" ON "inventory_items"("tenant_id", "name");
CREATE INDEX IF NOT EXISTS "inventory_movements_tenant_id_item_id_created_at_idx" ON "inventory_movements"("tenant_id", "item_id", "created_at");
CREATE INDEX IF NOT EXISTS "inventory_movements_item_id_idx" ON "inventory_movements"("item_id");
CREATE INDEX IF NOT EXISTS "clinic_documents_tenant_id_category_created_at_idx" ON "clinic_documents"("tenant_id", "category", "created_at");
CREATE INDEX IF NOT EXISTS "clinic_documents_tenant_id_patient_id_idx" ON "clinic_documents"("tenant_id", "patient_id");
CREATE INDEX IF NOT EXISTS "clinic_documents_patient_id_idx" ON "clinic_documents"("patient_id");
CREATE UNIQUE INDEX IF NOT EXISTS "integration_connections_tenant_id_provider_key" ON "integration_connections"("tenant_id", "provider");
CREATE INDEX IF NOT EXISTS "integration_connections_tenant_id_status_idx" ON "integration_connections"("tenant_id", "status");

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "inventory_items", "inventory_movements", "clinic_documents", "integration_connections" FROM anon, authenticated;
  END IF;
END $$;
