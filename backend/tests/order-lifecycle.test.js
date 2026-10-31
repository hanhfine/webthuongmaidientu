import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, resetDb, teardown, loginAs, createProduct, createPromotion, placeOrder } from './helpers.js';
import { Product } from '../src/models/Product.js';
import { Promotion } from '../src/models/Promotion.js';

before(setup);
beforeEach(resetDb);
after(teardown);

test('customer lists only their own orders and cannot read someone else’s', async () => {
  const a = await loginAs();
  const b = await loginAs();
  const p = await createProduct();
  const orderA = await placeOrder(a.user, [[p, 1]]);
  await placeOrder(b.user, [[p, 1]]);
  const list = await a.agent.get('/api/orders');
  assert.equal(list.body.total, 1);
  assert.equal((await a.agent.get(`/api/orders/${orderA._id}`)).status, 200);
  assert.equal((await b.agent.get(`/api/orders/${orderA._id}`)).status, 404);
});

test('cancelling restores stock exactly once and releases the promotion', async () => {
  const { agent, user } = await loginAs();
  const p = await createProduct({ stock: 5 });
  await createPromotion({ code: 'SALE10' });
  const order = await placeOrder(user, [[p, 2]], { promotionCode: 'SALE10' });
  assert.equal((await Product.findById(p._id)).stock, 3);
  const first = await agent.post(`/api/orders/${order._id}/cancel`);
  assert.equal(first.status, 200);
  assert.equal(first.body.status, 'cancelled');
  assert.equal((await Product.findById(p._id)).stock, 5);
  assert.equal((await Promotion.findOne({ code: 'SALE10' })).usedCount, 0);
  const second = await agent.post(`/api/orders/${order._id}/cancel`);
  assert.equal(second.status, 409);
  assert.equal((await Product.findById(p._id)).stock, 5);
});

test('a paid order cannot be cancelled; another customer cannot cancel it', async () => {
  const a = await loginAs();
  const b = await loginAs();
  const admin = await loginAs({ role: 'admin' });
  const p = await createProduct();
  const order = await placeOrder(a.user, [[p, 1]]);
  assert.equal((await b.agent.post(`/api/orders/${order._id}/cancel`)).status, 404);
  await admin.agent.patch(`/api/admin/orders/${order._id}/payment`).send({ paymentStatus: 'paid' }).expect(200);
  const res = await a.agent.post(`/api/orders/${order._id}/cancel`);
  assert.equal(res.status, 409);
  assert.equal(res.body.code, 'CANNOT_CANCEL');
});

test('admin walks an order through the allowed transitions and sets deliveredAt', async () => {
  const admin = await loginAs({ role: 'admin' });
  const { user } = await loginAs();
  const p = await createProduct();
  const order = await placeOrder(user, [[p, 1]]);
  const url = `/api/admin/orders/${order._id}/status`;
  for (const status of ['confirmed', 'shipping', 'delivered']) {
    const res = await admin.agent.patch(url).send({ status });
    assert.equal(res.status, 200, status);
    assert.equal(res.body.status, status);
  }
  const final = await admin.agent.get(`/api/admin/orders?status=delivered`);
  assert.ok(final.body.items[0].deliveredAt);
});

test('invalid transitions are rejected', async () => {
  const admin = await loginAs({ role: 'admin' });
  const { user } = await loginAs();
  const order = await placeOrder(user, [[await createProduct(), 1]]);
  const res = await admin.agent.patch(`/api/admin/orders/${order._id}/status`).send({ status: 'delivered' });
  assert.equal(res.status, 409);
  assert.equal(res.body.code, 'INVALID_TRANSITION');
});

test('a bank order cannot be confirmed before payment is recorded', async () => {
  const admin = await loginAs({ role: 'admin' });
  const { user } = await loginAs();
  const order = await placeOrder(user, [[await createProduct(), 1]], { paymentMethod: 'bank' });
  const url = `/api/admin/orders/${order._id}/status`;
  const early = await admin.agent.patch(url).send({ status: 'confirmed' });
  assert.equal(early.status, 409);
  assert.equal(early.body.code, 'PAYMENT_REQUIRED');
  await admin.agent.patch(`/api/admin/orders/${order._id}/payment`).send({ paymentStatus: 'paid' }).expect(200);
  assert.equal((await admin.agent.patch(url).send({ status: 'confirmed' })).status, 200);
});

test('admin can cancel an unpaid order (stock restored); customers cannot use admin routes', async () => {
  const admin = await loginAs({ role: 'admin' });
  const customer = await loginAs();
  const p = await createProduct({ stock: 4 });
  const order = await placeOrder(customer.user, [[p, 2]]);
  const res = await admin.agent.patch(`/api/admin/orders/${order._id}/status`).send({ status: 'cancelled' });
  assert.equal(res.body.status, 'cancelled');
  assert.equal((await Product.findById(p._id)).stock, 4);
  assert.equal((await customer.agent.get('/api/admin/orders')).status, 403);
});

test('payment can only be confirmed once and not on cancelled orders', async () => {
  const admin = await loginAs({ role: 'admin' });
  const { user } = await loginAs();
  const order = await placeOrder(user, [[await createProduct(), 1]]);
  const url = `/api/admin/orders/${order._id}/payment`;
  assert.equal((await admin.agent.patch(url).send({ paymentStatus: 'paid' })).status, 200);
  assert.equal((await admin.agent.patch(url).send({ paymentStatus: 'paid' })).status, 409);
  const other = await placeOrder(user, [[await createProduct(), 1]]);
  await admin.agent.patch(`/api/admin/orders/${other._id}/status`).send({ status: 'cancelled' });
  assert.equal((await admin.agent.patch(`/api/admin/orders/${other._id}/payment`).send({ paymentStatus: 'paid' })).status, 409);
});
