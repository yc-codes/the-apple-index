import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  countryCurrencies,
  regionPreferences,
  fallbackCountry,
  detectCountry,
} from '../src/region.js';
import { stores } from '../server/stores.js';
test('every Apple store country maps to its local currency', () => {
  for (const store of stores)
    assert.equal(countryCurrencies[store.code], store.currency, store.code);
});
test('India maps to INR and both common timezone names work', () => {
  assert.deepEqual(regionPreferences('in'), { country: 'in', currency: 'INR' });
  for (const zone of ['Asia/Kolkata', 'Asia/Calcutta'])
    assert.equal(fallbackCountry(zone, ['en-US']), 'in');
  assert.equal(fallbackCountry('Unknown', ['en-IN']), 'in');
});
test('IP country wins over timezone with safe failure fallback', async () => {
  assert.equal(
    await detectCountry('us', async () => ({
      ok: true,
      json: async () => ({ country_code: 'IN' }),
    })),
    'in',
  );
  assert.equal(
    await detectCountry('in', async () => {
      throw Error('offline');
    }),
    'in',
  );
  assert.equal(
    await detectCountry('in', async () => ({
      ok: true,
      json: async () => ({ country_code: 'ZZ' }),
    })),
    'in',
  );
});
