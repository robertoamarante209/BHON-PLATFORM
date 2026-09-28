DO $$ BEGIN
  CREATE TYPE "SecretaryConversationStatus" AS ENUM ('OPEN', 'WAITING_DETAILS', 'HUMAN_HANDOFF', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "SecretaryMessageDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "secretary_conversations" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "patient_id" TEXT,
  "contact_phone" TEXT NOT NULL,
  "contact_name" TEXT,
  "status" "SecretaryConversationStatus" NOT NULL DEFAULT 'OPEN',
  "last_intent" TEXT,
  "last_message_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "secretary_conversations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "secretary_conversations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "secretary_conversations_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "secretary_conversations_tenant_id_contact_phone_last_message_at_idx" ON "secretary_conversations"("tenant_id", "contact_phone", "last_message_at");
CREATE INDEX IF NOT EXISTS "secretary_conversations_tenant_id_status_last_message_at_idx" ON "secretary_conversations"("tenant_id", "status", "last_message_at");
CREATE INDEX IF NOT EXISTS "secretary_conversations_patient_id_idx" ON "secretary_conversations"("patient_id");

CREATE TABLE IF NOT EXISTS "secretary_messages" (
  "id" TEXT NOT NULL,
  "conversation_id" TEXT NOT NULL,
  "direction" "SecretaryMessageDirection" NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'DASHBOARD',
  "content" TEXT NOT NULL,
  "intent" TEXT,
  "action" TEXT,
  "action_status" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "secretary_messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "secretary_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "secretary_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "secretary_messages_conversation_id_created_at_idx" ON "secretary_messages"("conversation_id", "created_at");
CREATE INDEX IF NOT EXISTS "secretary_messages_intent_idx" ON "secretary_messages"("intent");
