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

