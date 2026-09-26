export type PatientImportRow = Record<string, unknown>;

export type NormalizedPatientImport = {
  name: string;
  cpf: string | null;
  phone: string | null;
  email: string | null;
  birthDate: string | null;
  source: string | null;
  allergies: string | null;
  observations: string | null;
};

export type PatientImportReview = {
  row: number;
  data: NormalizedPatientImport;
  errors: string[];
  status: "ready" | "invalid" | "duplicate";
  duplicateId?: string;
};

const value = (row: PatientImportRow, names: string[]) => {
  const entries = Object.entries(row);
  const match = entries.find(([key]) => names.includes(key.trim().toLocaleLowerCase("pt-BR")));
  return match?.[1] == null ? "" : String(match[1]).trim();
};

const digits = (input: string) => input.replace(/\D/g, "");

function validCpf(cpf: string) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const check = (length: number) => {
    const sum = cpf.slice(0, length).split("").reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return check(9) === Number(cpf[9]) && check(10) === Number(cpf[10]);
}

function dateOnly(input: string) {
  if (!input) return null;
  const brazilian = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const iso = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const [, year, month, day] = iso || [];
  const [, brazilianDay, brazilianMonth, brazilianYear] = brazilian || [];
  const resolvedYear = year || brazilianYear;
  const resolvedMonth = month || brazilianMonth;
  const resolvedDay = day || brazilianDay;
  if (!resolvedYear || !resolvedMonth || !resolvedDay) return undefined;
  const normalized = `${resolvedYear}-${resolvedMonth.padStart(2, "0")}-${resolvedDay.padStart(2, "0")}`;
  const candidate = new Date(`${normalized}T12:00:00Z`);
  return Number.isNaN(candidate.getTime()) || candidate.toISOString().slice(0, 10) !== normalized ? undefined : normalized;
}

export function normalizePatientRow(row: PatientImportRow): { data: NormalizedPatientImport; errors: string[] } {
  const name = value(row, ["name", "nome", "nome completo", "paciente"]);
  const rawCpf = value(row, ["cpf"]);
  const rawPhone = value(row, ["phone", "telefone", "celular", "whatsapp"]);
  const rawEmail = value(row, ["email", "e-mail"]);
  const rawBirthDate = value(row, ["birthdate", "birth date", "data de nascimento", "nascimento"]);
  const errors: string[] = [];
  const cpf = rawCpf ? digits(rawCpf) : null;
  const phone = rawPhone ? digits(rawPhone) : null;
  const email = rawEmail ? rawEmail.toLocaleLowerCase("pt-BR") : null;
  const birthDate = rawBirthDate ? dateOnly(rawBirthDate) : null;
  if (name.length < 2) errors.push("Informe o nome completo.");
  if (cpf && !validCpf(cpf)) errors.push("CPF inválido.");
  if (phone && (phone.length < 10 || phone.length > 13)) errors.push("Telefone inválido.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("E-mail inválido.");
  if (rawBirthDate && !birthDate) errors.push("Data de nascimento inválida.");
  return {
    data: {
      name,
      cpf,
      phone,
      email,
      birthDate,
      source: value(row, ["source", "origem"]) || null,
      allergies: value(row, ["allergies", "alergias"]) || null,
      observations: value(row, ["observations", "observações", "observacoes"]) || null,
    },
    errors,
  };
}

const folded = (input: string) => input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
const identityPhone = (input: string) => {
  const normalized = digits(input);
  return normalized.startsWith("55") && normalized.length >= 12 ? normalized.slice(2) : normalized;
};

export function patientIdentityKeys(patient: Pick<NormalizedPatientImport, "name" | "cpf" | "phone" | "email">) {
  const keys: string[] = [];
  if (patient.cpf) keys.push(`cpf:${digits(patient.cpf)}`);
  const contact = patient.phone ? `phone:${identityPhone(patient.phone)}` : patient.email ? `email:${patient.email.toLocaleLowerCase("pt-BR")}` : null;
  if (contact && patient.name.trim().length >= 2) keys.push(`name-contact:${folded(patient.name)}:${contact}`);
  return keys;
}

export function reviewPatientRows(rows: PatientImportRow[], existing: Array<{ id: string; name: string; cpf?: string | null; phone?: string | null; email?: string | null }>): PatientImportReview[] {
  const identity = new Map<string, string>();
  for (const patient of existing) for (const key of patientIdentityKeys(patient)) identity.set(key, patient.id);
  return rows.map((source, index) => {
    const normalized = normalizePatientRow(source);
    const keys = patientIdentityKeys(normalized.data);
    const duplicateId = keys.map((key) => identity.get(key)).find(Boolean);
    const result: PatientImportReview = {
      row: index + 2,
      data: normalized.data,
      errors: normalized.errors,
      status: normalized.errors.length ? "invalid" : duplicateId ? "duplicate" : "ready",
      ...(duplicateId ? { duplicateId } : {}),
    };
    if (!normalized.errors.length && !duplicateId) for (const key of keys) identity.set(key, `row:${index}`);
    return result;
  });
}
