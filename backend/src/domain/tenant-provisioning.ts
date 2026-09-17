export type TenantProvisioningInput = {
  name?: unknown;
  email?: unknown;
  ownerName?: unknown;
  ownerLogin?: unknown;
  temporaryPassword?: unknown;
};

export function clinicSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 54);
}

export function validateTenantProvisioning(input: TenantProvisioningInput) {
  const errors: string[] = [];
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim() : "";
  const ownerName = typeof input.ownerName === "string" ? input.ownerName.trim() : "";
  const ownerLogin = typeof input.ownerLogin === "string" ? input.ownerLogin.trim() : "";
  const temporaryPassword = typeof input.temporaryPassword === "string" ? input.temporaryPassword : "";
  if (name.length < 2) errors.push("Informe o nome da clínica.");
  if (!email.includes("@")) errors.push("Informe um e-mail de contato válido.");
  if (ownerName.length < 2) errors.push("Informe o responsável da clínica.");
  if (ownerLogin.length < 3) errors.push("Informe o usuário de acesso inicial.");
  if (temporaryPassword.length < 10) errors.push("A senha temporária deve ter ao menos 10 caracteres.");
  return errors;
}
