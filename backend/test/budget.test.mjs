import assert from "node:assert/strict";
import test from "node:test";
import { calculateBudget } from "../src/domain/budget.ts";

test("calcula orçamento em centavos sem deriva de ponto flutuante", () => {
  assert.deepEqual(calculateBudget({
    items: [
      { description: "Sessão clínica", quantity: 3, unitPrice: 0.1 },
      { description: "Material", quantity: 1.25, unitPrice: 10.11 },
    ],
    discountAmount: 0.01,
  }), {
    totalAmount: "12.94",
    discountAmount: "0.01",
    finalAmount: "12.93",
    items: [
      { description: "Sessão clínica", quantity: "3.00", unitPrice: "0.10", totalPrice: "0.30" },
      { description: "Material", quantity: "1.25", unitPrice: "10.11", totalPrice: "12.64" },
    ],
  });
});

test("rejeita precisão monetária além de centavos", () => {
  assert.throws(() => calculateBudget({
    items: [{ description: "Sessão", quantity: 1, unitPrice: 10.001 }],
  }), /duas casas decimais/i);
});

test("rejeita desconto maior que subtotal e total além de Decimal(12,2)", () => {
  assert.throws(() => calculateBudget({
    items: [{ description: "Sessão", quantity: 1, unitPrice: 10 }],
    discountAmount: 10.01,
  }), /desconto não pode ser maior/i);
  assert.throws(() => calculateBudget({
    items: [{ description: "Sessão", quantity: 2, unitPrice: 9_999_999_999.99 }],
  }), /limite monetário/i);
});

test("rejeita quantidade inválida, descrição vazia e mais de 50 itens", () => {
  assert.throws(() => calculateBudget({ items: [{ description: "Sessão", quantity: 0, unitPrice: 10 }] }), /quantidade/i);
  assert.throws(() => calculateBudget({ items: [{ description: "Sessão", quantity: 100_000_000, unitPrice: 0 }] }), /quantidade excede/i);
  assert.throws(() => calculateBudget({ items: [{ description: " ", quantity: 1, unitPrice: 10 }] }), /descrição/i);
  assert.throws(() => calculateBudget({ items: Array.from({ length: 51 }, () => ({ description: "Item", quantity: 1, unitPrice: 1 })) }), /50 itens/i);
});
