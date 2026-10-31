import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config.js';

test('default dev JWT secret is refused unless NODE_ENV is development or test', () => {
  assert.throws(() => loadConfig({}), /JWT_SECRET/);
  assert.throws(() => loadConfig({ NODE_ENV: 'production' }), /JWT_SECRET/);
  assert.doesNotThrow(() => loadConfig({ NODE_ENV: 'development' }));
  assert.doesNotThrow(() => loadConfig({ NODE_ENV: 'test' }));
  assert.equal(loadConfig({ JWT_SECRET: 'x'.repeat(40) }).jwtSecret, 'x'.repeat(40));
});

test('SHIPPING_FEE must be a non-negative integer; empty uses default', () => {
  const base = { NODE_ENV: 'test' };
  assert.equal(loadConfig({ ...base, SHIPPING_FEE: '' }).shippingFee, 30000);
  assert.equal(loadConfig({ ...base, SHIPPING_FEE: '0' }).shippingFee, 0);
  for (const v of ['abc', '-1', '1.5']) assert.throws(() => loadConfig({ ...base, SHIPPING_FEE: v }), /SHIPPING_FEE/);
});
