type RecoveryEnvironment = Record<string, string | undefined>;

export function getPasswordRecoveryConfiguration(env: RecoveryEnvironment = process.env) {
  const apiKey = env.RESEND_API_KEY;
  const from = env.PASSWORD_RECOVERY_FROM;
  const appUrl = env.PUBLIC_APP_URL?.replace(/\/$/, "");
  return { enabled: Boolean(apiKey && from && appUrl), apiKey, from, appUrl };
}

export async function deliverPasswordReset(input: { email: string; rawToken: string }, fetchImpl: typeof fetch = fetch, env: RecoveryEnvironment = process.env) {
  const config = getPasswordRecoveryConfiguration(env);
  if (!config.enabled || !config.apiKey || !config.from || !config.appUrl) return { delivered: false as const, reason: "NOT_CONFIGURED" as const };
  const url = `${config.appUrl}/redefinir-senha?token=${encodeURIComponent(input.rawToken)}`;
  const response = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: config.from, to: [input.email], subject: "Redefina sua senha BHON", html: `<p>Use este link para redefinir sua senha:</p><p><a href="${url}">Redefinir senha</a></p><p>O link expira em uma hora.</p>` }),
  });
  return { delivered: response.ok };
}
