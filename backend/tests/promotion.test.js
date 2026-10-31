import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, resetDb, teardown, loginAs, createProduct, createPromotion } from './helpers.js';
import * as promotionService from '../src/services/promotionService.js';

before(setup);
beforeEach(resetDb);
after(teardown);

async function cartWith(agent, price, qty = 1) {
  const p = await createProduct({ price, stock: 100 });
  await agent.post('/api/cart/items').send({ productId: String(p._id), quantity: qty });
}

test('computeDiscount: percent floors, fixed is capped at subtotal', () => {
  assert.equal(promotionService.computeDiscount({ type: 'percent', value: 10 }, 1_999_999), 199_999);
  assert.equal(promotionService.computeDiscount({ type: 'fixed', value: 500_000 }, 300_000), 300_000);
});

test('validate endpoint returns the discount for the server-side cart subtotal', async () => {
  const { agent } = await loginAs();
  await createPromotion({ code: 'SALE10', value: 10 });
  await cartWith(agent, 2_000_000);
  const res = await agent.post('/api/promotions/validate').send({ code: 'sale10' });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { code: 'SALE10', discount: 200_000, subtotal: 2_000_000 });
});

test('validate rejects expired, inactive, below-minimum and exhausted codes', async () => {
  const { agent } = await loginAs();
  await cartWith(agent, 1_000_000);
  await createPromotion({ code: 'OLD', endsAt: new Date(Date.now() - 1000) });
  await createPromotion({ code: 'OFF', isActive: false });
  await createPromotion({ code: 'BIG', minOrder: 5_000_000 });
  await createPromotion({ code: 'USED', maxUses: 1, usedCount: 1 });
  for (const code of ['OLD', 'OFF', 'BIG', 'USED', 'NOPE']) {
    const res = await agent.post('/api/promotions/validate').send({ code });
    assert.equal(res.status, 400, code);
    assert.equal(res.body.code, 'PROMO_INVALID', code);
  }
});

test('consume increments usedCount and refuses once exhausted; release gives it back', async () => {
  await createPromotion({ code: 'ONE', maxUses: 1 });
  await promotionService.consume('ONE', 1_000_000, undefined);
  await assert.rejects(() => promotionService.consume('ONE', 1_000_000, undefined), { code: 'PROMO_INVALID' });
  await promotionService.release('ONE', undefined);
  await promotionService.consume('ONE', 1_000_000, undefined);
});

test('admin manages promotions; customers are forbidden', async () => {
  const admin = await loginAs({ role: 'admin' });
  const body = {
    code: 'tet2026', type: 'fixed', value: 100000, minOrder: 0, maxUses: 5,
    startsAt: new Date().toISOString(), endsAt: new Date(Date.now() + 86_400_000).toISOString(),
  };
  const created = await admin.agent.post('/api/admin/promotions').send(body);
  assert.equal(created.status, 201);
  assert.equal(created.body.code, 'TET2026');
  assert.equal((await admin.agent.post('/api/admin/promotions').send(body)).status, 409);
  const updated = await admin.agent.put(`/api/admin/promotions/${created.body._id}`).send({ isActive: false });
  assert.equal(updated.body.isActive, false);
  assert.equal((await admin.agent.get('/api/admin/promotions')).body.length, 1);
  const customer = await loginAs();
  assert.equal((await customer.agent.get('/api/admin/promotions')).status, 403);
});
