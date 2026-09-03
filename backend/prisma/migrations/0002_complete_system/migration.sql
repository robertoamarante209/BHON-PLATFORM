-- Migração 0002: Expansão Completa do BHON Clinical Operating System

-- Enums Adicionais
DO $$ BEGIN
    CREATE TYPE "StageStatus" AS ENUM ('PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AppointmentStatus" AS ENUM ('CONFIRMADO', 'AGUARDANDO_CONFIRMACAO', 'NA_RECEPCAO', 'EM_ATENDIMENTO', 'CONCLUIDO', 'ATRASADO', 'FALTA', 'CANCELADO', 'ENCAIXE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "FollowUpCategory" AS ENUM ('POS_OPERATORIO', 'CONFIRMACAO', 'RETORNO', 'ORCAMENTO', 'TRATAMENTO', 'REATIVACAO', 'PENDENCIA_CLINICA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "FollowUpStatus" AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO', 'ADIADO', 'CANCELADO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PaymentStatus" AS ENUM ('PAGO', 'PENDENTE', 'ATRASADO', 'PARCIAL', 'CANCELADO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TransactionType" AS ENUM ('RECEITA', 'DESPESA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELLED', 'EXPIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'ANNUAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Atualizar UserRole se necessário
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'PLATFORM_OWNER';

-- Campos extras em users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "specialty" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "cro" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "workload_hours" DECIMAL(4,2);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "current_room_id" TEXT;

-- Campos extras em patients
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "record_number" TEXT;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "cpf" TEXT;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "allergies" TEXT;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "observations" TEXT;

-- Campos extras em treatments
ALTER TABLE "treatments" ADD COLUMN IF NOT EXISTS "total_value" DECIMAL(12,2);
ALTER TABLE "treatments" ADD COLUMN IF NOT EXISTS "progress_percent" INT DEFAULT 0;
ALTER TABLE "treatments" ADD COLUMN IF NOT EXISTS "next_stage_date" TIMESTAMPTZ(3);

-- Campos extras em quotes
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "discount_amount" DECIMAL(12,2) DEFAULT 0;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "final_amount" DECIMAL(12,2) DEFAULT 0;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "payment_method" TEXT;

-- Tabela: rooms (Consultórios)
CREATE TABLE IF NOT EXISTS "rooms" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order_index" INT NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "rooms_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "rooms_tenant_id_idx" ON "rooms"("tenant_id");

-- Tabela: treatment_stages (Etapas de Tratamento)
CREATE TABLE IF NOT EXISTS "treatment_stages" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "treatment_id" TEXT NOT NULL,
    "stage_number" INT NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "StageStatus" NOT NULL DEFAULT 'PENDING',
    "planned_date" TIMESTAMPTZ(3),
    "completed_date" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "treatment_stages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "treatment_stages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "treatment_stages_treatment_id_fkey" FOREIGN KEY ("treatment_id") REFERENCES "treatments"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "treatment_stages_tenant_id_idx" ON "treatment_stages"("tenant_id");
CREATE INDEX IF NOT EXISTS "treatment_stages_tenant_id_treatment_id_idx" ON "treatment_stages"("tenant_id", "treatment_id");

-- Tabela: appointments (Agenda Operacional)
CREATE TABLE IF NOT EXISTS "appointments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "treatment_id" TEXT,
    "treatment_stage_id" TEXT,
    "scheduled_at" TIMESTAMPTZ(3) NOT NULL,
    "duration_minutes" INT NOT NULL DEFAULT 30,
    "procedure_name" TEXT NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'CONFIRMADO',
    "delay_minutes" INT NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "appointments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "appointments_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "appointments_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "appointments_treatment_id_fkey" FOREIGN KEY ("treatment_id") REFERENCES "treatments"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "appointments_treatment_stage_id_fkey" FOREIGN KEY ("treatment_stage_id") REFERENCES "treatment_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "appointments_tenant_id_idx" ON "appointments"("tenant_id");
CREATE INDEX IF NOT EXISTS "appointments_tenant_id_scheduled_at_idx" ON "appointments"("tenant_id", "scheduled_at");
CREATE INDEX IF NOT EXISTS "appointments_tenant_id_room_id_idx" ON "appointments"("tenant_id", "room_id");
CREATE INDEX IF NOT EXISTS "appointments_tenant_id_professional_id_idx" ON "appointments"("tenant_id", "professional_id");
CREATE INDEX IF NOT EXISTS "appointments_tenant_id_patient_id_idx" ON "appointments"("tenant_id", "patient_id");
CREATE INDEX IF NOT EXISTS "appointments_tenant_id_status_idx" ON "appointments"("tenant_id", "status");

-- Tabela: follow_ups (Filas de Acompanhamento Operacional)
CREATE TABLE IF NOT EXISTS "follow_ups" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "appointment_id" TEXT,
    "responsible_user_id" TEXT,
    "category" "FollowUpCategory" NOT NULL,
    "reason" TEXT NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "FollowUpStatus" NOT NULL DEFAULT 'PENDENTE',
    "deadline_at" TIMESTAMPTZ(3) NOT NULL,
    "last_contact_at" TIMESTAMPTZ(3),
    "next_action" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "follow_ups_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "follow_ups_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "follow_ups_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "follow_ups_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "follow_ups_responsible_user_id_fkey" FOREIGN KEY ("responsible_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "follow_ups_tenant_id_idx" ON "follow_ups"("tenant_id");
CREATE INDEX IF NOT EXISTS "follow_ups_tenant_id_category_idx" ON "follow_ups"("tenant_id", "category");
CREATE INDEX IF NOT EXISTS "follow_ups_tenant_id_status_idx" ON "follow_ups"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "follow_ups_tenant_id_deadline_at_idx" ON "follow_ups"("tenant_id", "deadline_at");

-- Tabela: payments (Contas a Receber da Clínica)
CREATE TABLE IF NOT EXISTS "payments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "quote_id" TEXT,
    "treatment_id" TEXT,
    "reference_type" TEXT NOT NULL DEFAULT 'TREATMENT',
    "amount" DECIMAL(12,2) NOT NULL,
    "due_date" DATE NOT NULL,
    "paid_at" TIMESTAMPTZ(3),
    "payment_method" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDENTE',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "payments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "payments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "payments_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "payments_treatment_id_fkey" FOREIGN KEY ("treatment_id") REFERENCES "treatments"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "payments_tenant_id_idx" ON "payments"("tenant_id");
CREATE INDEX IF NOT EXISTS "payments_tenant_id_patient_id_idx" ON "payments"("tenant_id", "patient_id");
CREATE INDEX IF NOT EXISTS "payments_tenant_id_status_idx" ON "payments"("tenant_id", "status");

-- Tabela: financial_transactions (Fluxo de Caixa da Clínica)
CREATE TABLE IF NOT EXISTS "financial_transactions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "due_date" DATE NOT NULL,
    "paid_at" TIMESTAMPTZ(3),
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDENTE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "financial_transactions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "financial_transactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "financial_transactions_tenant_id_idx" ON "financial_transactions"("tenant_id");
CREATE INDEX IF NOT EXISTS "financial_transactions_tenant_id_type_idx" ON "financial_transactions"("tenant_id", "type");
CREATE INDEX IF NOT EXISTS "financial_transactions_tenant_id_status_idx" ON "financial_transactions"("tenant_id", "status");

-- Faturamento da Plataforma BHON
CREATE TABLE IF NOT EXISTS "subscription_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL UNIQUE,
    "max_professionals" INT NOT NULL DEFAULT 5,
    "max_rooms" INT NOT NULL DEFAULT 3,
    "monthly_price" DECIMAL(10,2) NOT NULL,
    "annual_price" DECIMAL(10,2) NOT NULL,
    "features_json" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "subscriptions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "billing_cycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "current_period_start" TIMESTAMPTZ(3) NOT NULL,
    "current_period_end" TIMESTAMPTZ(3) NOT NULL,
    "renewal_date" TIMESTAMPTZ(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "subscriptions_tenant_id_idx" ON "subscriptions"("tenant_id");

CREATE TABLE IF NOT EXISTS "platform_invoices" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL UNIQUE,
    "amount" DECIMAL(10,2) NOT NULL,
    "due_date" DATE NOT NULL,
    "paid_at" TIMESTAMPTZ(3),
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDENTE',
    "payment_method" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "platform_invoices_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "platform_invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "platform_invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "platform_invoices_tenant_id_idx" ON "platform_invoices"("tenant_id");

CREATE TABLE IF NOT EXISTS "platform_payments" (
    "id" TEXT NOT NULL,
    "platform_invoice_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paid_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "gateway_ref" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_payments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "platform_payments_platform_invoice_id_fkey" FOREIGN KEY ("platform_invoice_id") REFERENCES "platform_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "support_tickets" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "opened_by_user_id" TEXT NOT NULL,
    "assigned_to_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(3),
    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "support_tickets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "support_tickets_opened_by_user_id_fkey" FOREIGN KEY ("opened_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "support_tickets_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "support_tickets_tenant_id_idx" ON "support_tickets"("tenant_id");

CREATE TABLE IF NOT EXISTS "notifications" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "notifications_tenant_id_user_id_idx" ON "notifications"("tenant_id", "user_id");
