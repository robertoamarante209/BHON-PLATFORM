import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGoogleEmail, matchesPreauthorizedGoogleEmail } from '../src/domain/google-identity.ts';

test('normalizes and matches a preauthorized Google email case-insensitively', () => {
  assert.equal(normalizeGoogleEmail('  RobertoAmarante209@GMAIL.COM '), 'robertoamarante209@gmail.com');
  assert.equal(matchesPreauthorizedGoogleEmail('robertoamarante209@gmail.com', ' ROBERTOAMARANTE209@GMAIL.COM '), true);
});
