import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app, setup, resetDb, teardown, loginAs, createProduct } from './helpers.js';

before(setup);
beforeEach(resetDb);
after(teardown);

test('cart requires login', async () => {
  assert.equal((await request(app).get('/api/cart')).status, 401);
});

test('empty cart view', async () => {
  const { agent } = await loginAs();
  const res = await agent.get('/api/cart');
  assert.deepEqual(res.body, { items: [], subtotal: 0 });
});

test('add merges quantity for the same product and computes subtotal', async () => {
  const { agent } = await loginAs();
  const p = await createProduct({ price: 1_000_000, stock: 10 });
  await agent.post('/api/cart/items').send({ productId: String(p._id), quantity: 2 });
  const res = await agent.post('/api/cart/items').send({ productId: String(p._id), quantity: 1 });
  assert.equal(res.status, 200);
  assert.equal(res.body.items.length, 1);
  assert.equal(res.body.items[0].quantity, 3);
  assert.equal(res.body.subtotal, 3_000_000);
});

test('cannot add more than stock or an inactive product', async () => {
  const { agent } = await loginAs();
  const p = await createProduct({ stock: 2 });
  const over = await agent.post('/api/cart/items').send({ productId: String(p._id), quantity: 3 });
  assert.equal(over.status, 409);
  assert.equal(over.body.code, 'OUT_OF_STOCK');
  const hidden = await createProduct({ isActive: false });
  const res = await agent.post('/api/cart/items').send({ productId: String(hidden._id), quantity: 1 });
  assert.equal(res.status, 404);
});

test('patch sets quantity, delete removes the line', async () => {
  const { agent } = await loginAs();
  const p = await createProduct({ stock: 10 });
  await agent.post('/api/cart/items').send({ productId: String(p._id), quantity: 1 });
  const patched = await agent.patch(`/api/cart/items/${p._id}`).send({ quantity: 4 });
  assert.equal(patched.body.items[0].quantity, 4);
  const removed = await agent.delete(`/api/cart/items/${p._id}`);
  assert.equal(removed.body.items.length, 0);
});

test('carts are per-user', async () => {
  const a = await loginAs();
  const b = await loginAs();
  const p = await createProduct();
  await a.agent.post('/api/cart/items').send({ productId: String(p._id), quantity: 1 });
  assert.equal((await b.agent.get('/api/cart')).body.items.length, 0);
});

test('quantity must be a positive integer', async () => {
  const { agent } = await loginAs();
  const p = await createProduct();
  const res = await agent.post('/api/cart/items').send({ productId: String(p._id), quantity: 0 });
  assert.equal(res.status, 400);
});
