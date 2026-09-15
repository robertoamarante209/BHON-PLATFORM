const MONEY_SCALE = 100n;
const QUANTITY_SCALE = 100n;
const MAX_MONEY_CENTS = 999_999_999_999n;
const MAX_QUANTITY_HUNDREDTHS = 9_999_999_999n;

export type BudgetInput = {
  items: Array<{ description: unknown; quantity: unknown; unitPrice: unknown }>;
  discountAmount?: unknown;
};

function scaledInteger(value: unknown, scale: bigint, label: string, allowZero: boolean): bigint {
  if ((typeof value !== "number" && typeof value !== "string") || String(value).trim() === "") {
    throw new Error(`${label} inválido.`);
  }
  const text = String(value).trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(text)) throw new Error(`${label} deve ter no máximo duas casas decimais.`);
  const [whole = "0", fraction = ""] = text.split(".");
  const result = BigInt(whole) * scale + BigInt(fraction.padEnd(2, "0"));
  if (allowZero ? result < 0n : result <= 0n) throw new Error(`${label} inválido.`);
  return result;
}

function decimal(value: bigint, scale: bigint): string {
  return `${value / scale}.${(value % scale).toString().padStart(2, "0")}`;
}

export function calculateBudget(input: BudgetInput) {
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 50) throw new Error("O orçamento deve conter de 1 a 50 itens.");
  let total = 0n;
  const items = input.items.map((raw) => {
    const description = typeof raw.description === "string" ? raw.description.trim() : "";
    if (description.length < 2 || description.length > 200) throw new Error("Descrição do item deve ter entre 2 e 200 caracteres.");
    const quantity = scaledInteger(raw.quantity, QUANTITY_SCALE, "Quantidade", false);
    if (quantity > MAX_QUANTITY_HUNDREDTHS) throw new Error("Quantidade excede o limite permitido.");
    const unitPrice = scaledInteger(raw.unitPrice, MONEY_SCALE, "Valor unitário", true);
    const totalPrice = (quantity * unitPrice + 50n) / QUANTITY_SCALE;
    if (unitPrice > MAX_MONEY_CENTS || totalPrice > MAX_MONEY_CENTS) throw new Error("Item excede o limite monetário permitido.");
    total += totalPrice;
    return { description, quantity: decimal(quantity, QUANTITY_SCALE), unitPrice: decimal(unitPrice, MONEY_SCALE), totalPrice: decimal(totalPrice, MONEY_SCALE) };
  });
  if (total > MAX_MONEY_CENTS) throw new Error("Orçamento excede o limite monetário permitido.");
  const discount = input.discountAmount == null || input.discountAmount === "" ? 0n : scaledInteger(input.discountAmount, MONEY_SCALE, "Desconto", true);
  if (discount > total) throw new Error("O desconto não pode ser maior que o subtotal.");
  return { totalAmount: decimal(total, MONEY_SCALE), discountAmount: decimal(discount, MONEY_SCALE), finalAmount: decimal(total - discount, MONEY_SCALE), items };
}
