-- Trigger functions run for every communication audit event. Pin their lookup
-- path so an attacker cannot influence name resolution through session state.
ALTER FUNCTION "prevent_communication_event_update"() SET search_path = pg_catalog;
ALTER FUNCTION "prevent_communication_event_delete"() SET search_path = pg_catalog;
