export function normalizeGoogleEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function matchesPreauthorizedGoogleEmail(preauthorizedEmail: string | null | undefined, googleEmail: string): boolean {
  if (!preauthorizedEmail) return false;
  return normalizeGoogleEmail(preauthorizedEmail) === normalizeGoogleEmail(googleEmail);
}
