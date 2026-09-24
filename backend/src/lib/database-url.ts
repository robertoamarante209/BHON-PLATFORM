export function normalizeDatabaseUrl(connectionString: string): string {
  const url = new URL(connectionString);

  if (url.hostname.endsWith(".pooler.supabase.com")) {
    // Supavisor presents a chain that node-postgres cannot validate with its
    // bundled CA set. Keep TLS enabled while using its documented no-verify mode.
    url.searchParams.set("sslmode", "no-verify");
  }

  return url.toString();
}
