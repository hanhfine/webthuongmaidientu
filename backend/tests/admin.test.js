import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app, setup, resetDb, teardown, loginAs, createUser } from './helpers.js';
import { Order } from '../src/models/Order.js';

before(setup);
beforeEach(resetDb);
after(teardown);

test('admin lists users without password hashes and can search', async () => {
  const admin = await loginAs({ role: 'admin' });
  await createUser({ email: 'findme@test.local', fullName: 'Tìm Tôi' });
  const res = await admin.agent.get('/api/admin/users?q=findme');
  assert.equal(res.status, 200);
  assert.equal(res.body.total, 1);
  assert.equal(res.body.items[0].passwordHash, undefined);
});

test('admin locks a customer, who can then no longer log in; cannot lock self', async () => {
  const admin = await loginAs({ role: 'admin' });
  const { user, email, password } = await createUser();
  const locked = await admin.agent.patch(`/api/admin/users/${user._id}/status`).send({ isActive: false });
  assert.equal(locked.status, 200);
  const login = await request(app).post('/api/auth/login').send({ email, password });
  assert.equal(login.status, 403);
  const self = await admin.agent.patch(`/api/admin/users/${admin.user._id}/status`).send({ isActive: false });
  assert.equal(self.status, 400);
});

test('customers cannot reach admin user/stat routes', async () => {
  const { agent } = await loginAs();
  assert.equal((await agent.get('/api/admin/users')).status, 403);
  assert.equal((await agent.get('/api/admin/stats/revenue')).status, 403);
});

async function makeOrder(user, { total, shippingFee = 30_000, status, paymentStatus, deliveredAt }) {
  return Order.create({
    userId: user._id,
    requestKey: `k-${Math.random()}`,
    items: [{ productId: user._id, name: 'x', price: total - shippingFee, quantity: 1 }],
    shippingAddress: { fullName: 'a', phone: '12345678', address: 'abcdef' },
    subtotal: total - shippingFee, shippingFee, total,
    paymentMethod: 'cod', paymentStatus, status, deliveredAt,
  });
}

test('revenue counts only delivered AND paid orders, excluding shipping fee', async () => {
  const admin = await loginAs({ role: 'admin' });
  const { user } = await createUser();
  const day = new Date('2026-10-10T05:00:00Z');
  await makeOrder(user, { total: 1_030_000, status: 'delivered', paymentStatus: 'paid', deliveredAt: day });
  await makeOrder(user, { total: 530_000, status: 'delivered', paymentStatus: 'paid', deliveredAt: day });
  await makeOrder(user, { total: 999_000, status: 'delivered', paymentStatus: 'unpaid', deliveredAt: day });
  await makeOrder(user, { total: 999_000, status: 'cancelled', paymentStatus: 'paid', deliveredAt: day });
  await makeOrder(user, { total: 999_000, status: 'shipping', paymentStatus: 'paid', deliveredAt: day });
  await makeOrder(user, { total: 700_000, status: 'delivered', paymentStatus: 'paid', deliveredAt: new Date('2026-09-01T05:00:00Z') });

  const res = await admin.agent.get('/api/admin/stats/revenue?from=2026-10-01&to=2026-10-31');
  assert.equal(res.status, 200);
  assert.equal(res.body.revenue, 1_000_000 + 500_000);
  assert.equal(res.body.orderCount, 2);
  assert.deepEqual(res.body.byDay, [{ date: '2026-10-10', revenue: 1_500_000, orders: 2 }]);
});

test('a date-only "to" includes that entire day', async () => {
  const admin = await loginAs({ role: 'admin' });
  const { user } = await createUser();
  await makeOrder(user, { total: 130_000, status: 'delivered', paymentStatus: 'paid', deliveredAt: new Date('2026-10-31T12:00:00Z') });
  const res = await admin.agent.get('/api/admin/stats/revenue?from=2026-10-31&to=2026-10-31');
  assert.equal(res.body.orderCount, 1);
});

test('date-only bounds are Vietnam-local days (23:59:59.999 in, next 00:00 out)', async () => {
  const admin = await loginAs({ role: 'admin' });
  const { user } = await createUser();
  await makeOrder(user, { total: 130_000, status: 'delivered', paymentStatus: 'paid', deliveredAt: new Date('2026-10-31T23:59:59.999+07:00') });
  await makeOrder(user, { total: 130_000, status: 'delivered', paymentStatus: 'paid', deliveredAt: new Date('2026-11-01T00:00:00+07:00') });
  const res = await admin.agent.get('/api/admin/stats/revenue?from=2026-10-01&to=2026-10-31');
  assert.equal(res.status, 200);
  assert.equal(res.body.orderCount, 1);
  assert.deepEqual(res.body.byDay, [{ date: '2026-10-31', revenue: 100_000, orders: 1 }]);
});

test('an order delivered 2026-09-30T18:00Z (VN 1 Oct) counts for from=2026-10-01', async () => {
  const admin = await loginAs({ role: 'admin' });
  const { user } = await createUser();
  await makeOrder(user, { total: 130_000, status: 'delivered', paymentStatus: 'paid', deliveredAt: new Date('2026-09-30T18:00:00Z') });
  const res = await admin.agent.get('/api/admin/stats/revenue?from=2026-10-01&to=2026-10-31');
  assert.equal(res.body.orderCount, 1);
  assert.deepEqual(res.body.byDay, [{ date: '2026-10-01', revenue: 100_000, orders: 1 }]);
});

test('invalid date is rejected with 400', async () => {
  const admin = await loginAs({ role: 'admin' });
  assert.equal((await admin.agent.get('/api/admin/stats/revenue?from=not-a-date')).status, 400);
  assert.equal((await admin.agent.get('/api/admin/stats/revenue?from=2026-02-31&to=2026-03-01')).status, 400);
});

test('from after to is rejected with 400', async () => {
  const admin = await loginAs({ role: 'admin' });
  const res = await admin.agent.get('/api/admin/stats/revenue?from=2026-10-31&to=2026-10-01');
  assert.equal(res.status, 400);
});
