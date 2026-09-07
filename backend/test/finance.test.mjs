import test from 'node:test';
import assert from 'node:assert/strict';
import { effectivePaymentStatus, moneyToCents, outstandingCents, receiptResult } from '../src/domain/finance.ts';

test('converte valores monetários para centavos sem ponto flutuante residual', () => {
  assert.equal(moneyToCents(123.45), 12345);
  assert.equal(moneyToCents(-1), 0);
});

test('liquidação parcial preserva saldo e status parcial', () => {
  assert.deepEqual(receiptResult(10000, 2000, 3000), { valid: true, nextPaidCents: 5000, outstandingCents: 5000, status: 'PARCIAL' });
});

test('liquidação integral fecha o recebível e bloqueia sobrepagamento', () => {
  assert.equal(receiptResult(10000, 2000, 8000).status, 'PAGO');
  assert.deepEqual(receiptResult(10000, 9000, 1001), { valid: false, reason: 'AMOUNT_EXCEEDS_OUTSTANDING' });
  assert.equal(outstandingCents(10000, 11000), 0);
});

test('status efetivo considera vencimento sem apagar cancelamento', () => {
  const today = new Date('2026-09-07T00:00:00.000Z');
  assert.equal(effectivePaymentStatus({ status: 'PENDENTE', totalCents: 1000, paidCents: 0, dueDate: new Date('2026-09-06T00:00:00.000Z'), today }), 'ATRASADO');
  assert.equal(effectivePaymentStatus({ status: 'CANCELADO', totalCents: 1000, paidCents: 0, dueDate: new Date('2026-09-06T00:00:00.000Z'), today }), 'CANCELADO');
});

