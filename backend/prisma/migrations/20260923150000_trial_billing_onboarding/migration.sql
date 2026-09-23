DO $$ BEGIN
  CREATE TYPE "TrialSignupStatus" AS ENUM ('PENDING', 'CHECKOUT_STARTED', 'CHECKOUT_COMPLETED', 'PROVISIONED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "NotificationOutboxStatus" AS ENUM ('PENDING', 'SENT', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "stripe_customer_id" TEXT;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "stripe_subscription_id" TEXT;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "stripe_price_id" TEXT;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "stripe_livemode" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_stripe_customer_id_key" ON "subscriptions"("stripe_customer_id") WHERE "stripe_customer_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id") WHERE "stripe_subscription_id" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "trial_signups" (
  "id" TEXT NOT NULL,
  "clinic_name" TEXT NOT NULL,
  "owner_name" TEXT NOT NULL,
  "owner_email" TEXT NOT NULL,
  "owner_email_normalized" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "phone" TEXT,
  "billing_cycle" "BillingCycle" NOT NULL,
  "status" "TrialSignupStatus" NOT NULL DEFAULT 'PENDING',
  "stripe_checkout_session_id" TEXT,
  "tenant_id" TEXT,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "trial_signups_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "trial_signups_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "trial_signups_stripe_checkout_session_id_key" ON "trial_signups"("stripe_checkout_session_id") WHERE "stripe_checkout_session_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "trial_signups_owner_email_normalized_status_idx" ON "trial_signups"("owner_email_normalized", "status");
CREATE INDEX IF NOT EXISTS "trial_signups_expires_at_idx" ON "trial_signups"("expires_at");

CREATE TABLE IF NOT EXISTS "legal_consents" (
  "id" TEXT NOT NULL,
  "trial_signup_id" TEXT NOT NULL,
  "document_type" TEXT NOT NULL,
  "document_version" TEXT NOT NULL,
  "accepted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "legal_consents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "legal_consents_trial_signup_id_fkey" FOREIGN KEY ("trial_signup_id") REFERENCES "trial_signups"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "legal_consents_trial_signup_id_document_type_key" UNIQUE ("trial_signup_id", "document_type")
);

CREATE TABLE IF NOT EXISTS "stripe_webhook_events" (
  "id" TEXT NOT NULL,
  "stripe_event_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "livemode" BOOLEAN NOT NULL,
  "payload" JSONB NOT NULL,
  "received_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMPTZ(3),
  "processing_error" TEXT,
  CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stripe_webhook_events_stripe_event_id_key" UNIQUE ("stripe_event_id")
);
CREATE INDEX IF NOT EXISTS "stripe_webhook_events_processed_at_idx" ON "stripe_webhook_events"("processed_at");

CREATE TABLE IF NOT EXISTS "subscription_transitions" (
  "id" TEXT NOT NULL,
  "subscription_id" TEXT NOT NULL,
  "from_status" "SubscriptionStatus",
  "to_status" "SubscriptionStatus" NOT NULL,
  "stripe_event_id" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscription_transitions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "subscription_transitions_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "subscription_transitions_subscription_id_created_at_idx" ON "subscription_transitions"("subscription_id", "created_at");

CREATE TABLE IF NOT EXISTS "onboarding_progress" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "clinic_profile_ready_at" TIMESTAMPTZ(3),
  "team_ready_at" TIMESTAMPTZ(3),
  "patient_ready_at" TIMESTAMPTZ(3),
  "appointment_ready_at" TIMESTAMPTZ(3),
  "follow_up_ready_at" TIMESTAMPTZ(3),
  "first_value_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "onboarding_progress_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "onboarding_progress_tenant_id_key" UNIQUE ("tenant_id"),
  CONSTRAINT "onboarding_progress_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "notification_outbox" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "template_key" TEXT NOT NULL,
  "status" "NotificationOutboxStatus" NOT NULL DEFAULT 'PENDING',
  "scheduled_for" TIMESTAMPTZ(3),
  "sent_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_outbox_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notification_outbox_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "notification_outbox_status_scheduled_for_idx" ON "notification_outbox"("status", "scheduled_for");
