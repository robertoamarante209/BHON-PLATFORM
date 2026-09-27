-- The BHON frontend never accesses Supabase's Data API directly. Keep every
-- public table closed to anon/authenticated roles; the tenant-aware backend is
-- the sole application data boundary. Some platform tables are created outside
-- Prisma's local migration harness, so each target is guarded for reproducible
-- fresh-database verification.
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'tenants', 'users', 'sessions', 'patients', 'treatments', 'quotes',
    'quote_items', 'opportunities', 'tasks', 'timeline_events', 'audit_logs',
    '_prisma_migrations', 'rooms', 'treatment_stages', 'appointments',
    'follow_ups', 'payments', 'financial_transactions', 'subscription_plans',
    'subscriptions', 'platform_invoices', 'platform_payments', 'support_tickets',
    'notifications', 'payment_receipts', 'inventory_items', 'inventory_movements',
    'clinic_documents', 'integration_connections', 'clinic_availability',
    'clinic_protocols', 'trial_signups', 'legal_consents', 'stripe_webhook_events',
    'subscription_transitions', 'onboarding_progress', 'notification_outbox',
    'contact_consents', 'recovery_opportunities', 'recovery_sequences',
    'communication_events'
  ]
  LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    END IF;
  END LOOP;
END;
$$;
