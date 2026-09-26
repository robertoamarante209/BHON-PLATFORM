CREATE TYPE "ConsentStatus" AS ENUM ('ACTIVE', 'REVOKED');
CREATE TYPE "RecoverySequenceStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ENDED');

CREATE UNIQUE INDEX "patients_tenant_id_id_key" ON "patients"("tenant_id", "id");

CREATE TABLE "contact_consents" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "patient_id" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "status" "ConsentStatus" NOT NULL DEFAULT 'ACTIVE',
  "captured_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "source" TEXT NOT NULL,
  "policy_version" TEXT NOT NULL,
  "revoked_at" TIMESTAMPTZ(3),
  "revocation_source" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "contact_consents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "contact_consents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "contact_consents_tenant_id_patient_id_fkey" FOREIGN KEY ("tenant_id", "patient_id") REFERENCES "patients"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "recovery_opportunities" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "patient_id" TEXT NOT NULL,
  "source_type" TEXT NOT NULL,
  "source_id" TEXT NOT NULL,
  "stage" TEXT NOT NULL DEFAULT 'ACTION_REQUIRED',
  "estimated_value" DECIMAL(12, 2),
  "priority_score" INTEGER NOT NULL DEFAULT 0,
  "strategy" TEXT,
  "next_action_at" TIMESTAMPTZ(3),
  "assigned_to_id" TEXT,
  "closed_reason" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "recovery_opportunities_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "recovery_opportunities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "recovery_opportunities_tenant_id_patient_id_fkey" FOREIGN KEY ("tenant_id", "patient_id") REFERENCES "patients"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "recovery_opportunities_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "recovery_opportunities_tenant_id_id_key" ON "recovery_opportunities"("tenant_id", "id");

CREATE TABLE "recovery_sequences" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "patient_id" TEXT NOT NULL,
  "opportunity_id" TEXT NOT NULL,
  "step" INTEGER NOT NULL DEFAULT 1,
  "scheduled_at" TIMESTAMPTZ(3),
  "status" "RecoverySequenceStatus" NOT NULL DEFAULT 'ACTIVE',
  "message_template_version" TEXT,
  "sent_at" TIMESTAMPTZ(3),
  "responded_at" TIMESTAMPTZ(3),
  "handoff_at" TIMESTAMPTZ(3),
  "ended_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "recovery_sequences_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "recovery_sequences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "recovery_sequences_tenant_id_patient_id_fkey" FOREIGN KEY ("tenant_id", "patient_id") REFERENCES "patients"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "recovery_sequences_tenant_id_opportunity_id_fkey" FOREIGN KEY ("tenant_id", "opportunity_id") REFERENCES "recovery_opportunities"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "recovery_sequences_tenant_id_id_key" ON "recovery_sequences"("tenant_id", "id");

CREATE TABLE "communication_events" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "patient_id" TEXT NOT NULL,
  "opportunity_id" TEXT NOT NULL,
  "sequence_id" TEXT,
  "channel" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "content_redacted" TEXT,
  "provider_message_id" TEXT,
  "actor_type" TEXT NOT NULL,
  "actor_id" TEXT,
  "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "communication_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "communication_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "communication_events_tenant_id_patient_id_fkey" FOREIGN KEY ("tenant_id", "patient_id") REFERENCES "patients"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "communication_events_tenant_id_opportunity_id_fkey" FOREIGN KEY ("tenant_id", "opportunity_id") REFERENCES "recovery_opportunities"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "communication_events_tenant_id_sequence_id_fkey" FOREIGN KEY ("tenant_id", "sequence_id") REFERENCES "recovery_sequences"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "contact_consents_tenant_id_patient_id_idx" ON "contact_consents"("tenant_id", "patient_id");
CREATE INDEX "contact_consents_tenant_id_patient_id_channel_purpose_status_idx" ON "contact_consents"("tenant_id", "patient_id", "channel", "purpose", "status");
CREATE INDEX "recovery_opportunities_tenant_id_patient_id_idx" ON "recovery_opportunities"("tenant_id", "patient_id");
CREATE INDEX "recovery_opportunities_tenant_id_stage_next_action_at_idx" ON "recovery_opportunities"("tenant_id", "stage", "next_action_at");
CREATE INDEX "recovery_opportunities_tenant_id_source_type_source_id_idx" ON "recovery_opportunities"("tenant_id", "source_type", "source_id");
CREATE INDEX "recovery_sequences_tenant_id_patient_id_idx" ON "recovery_sequences"("tenant_id", "patient_id");
CREATE INDEX "recovery_sequences_tenant_id_opportunity_id_idx" ON "recovery_sequences"("tenant_id", "opportunity_id");
CREATE INDEX "recovery_sequences_tenant_id_status_scheduled_at_idx" ON "recovery_sequences"("tenant_id", "status", "scheduled_at");
CREATE UNIQUE INDEX "recovery_sequences_one_active_per_patient"
  ON "recovery_sequences"("patient_id")
  WHERE "status" = 'ACTIVE';
CREATE INDEX "communication_events_tenant_id_patient_id_idx" ON "communication_events"("tenant_id", "patient_id");
CREATE INDEX "communication_events_tenant_id_opportunity_id_occurred_at_idx" ON "communication_events"("tenant_id", "opportunity_id", "occurred_at");
CREATE INDEX "communication_events_sequence_id_idx" ON "communication_events"("sequence_id");

CREATE OR REPLACE FUNCTION "prevent_communication_event_update"()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."occurred_at" IS DISTINCT FROM NEW."occurred_at" THEN
    RAISE EXCEPTION 'Communication event occurrence timestamps are immutable';
  END IF;

  RAISE EXCEPTION 'Communication events are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "prevent_communication_event_delete"()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Communication events are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "communication_events_occurred_at_immutable"
BEFORE UPDATE ON "communication_events"
FOR EACH ROW EXECUTE FUNCTION "prevent_communication_event_update"();

CREATE TRIGGER "communication_events_delete_forbidden"
BEFORE DELETE ON "communication_events"
FOR EACH ROW EXECUTE FUNCTION "prevent_communication_event_delete"();
