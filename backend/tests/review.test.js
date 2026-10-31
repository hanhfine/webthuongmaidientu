import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app, setup, resetDb, teardown, loginAs, createProduct, placeOrder } from './helpers.js';
import { Order } from '../src/models/Order.js';
import { Product } from '../src/models/Product.js';

before(setup);
beforeEach(resetDb);
after(teardown);

const deliver = (order) => Order.updateOne({ _id: order._id }, { status: 'delivered', deliveredAt: new Date() });

test('cannot review without a delivered order containing the product', async () => {
  const { agent, user } = await loginAs();
  const p = await createProduct();
  assert.equal((await agent.post(`/api/products/${p._id}/reviews`).send({ rating: 5 })).status, 403);
  await placeOrder(user, [[p, 1]]);
  const res = await agent.post(`/api/products/${p._id}/reviews`).send({ rating: 5 });
  assert.equal(res.status, 403);
  assert.equal(res.body.code, 'NOT_PURCHASED');
});

test('review is created, then edited on the second submit; rating aggregates update', async () => {
  const { agent, user } = await loginAs();
  const p = await createProduct();
  await deliver(await placeOrder(user, [[p, 1]]));
  const first = await agent.post(`/api/products/${p._id}/reviews`).send({ rating: 5, comment: 'Tốt' });
  assert.equal(first.status, 201);
  const second = await agent.post(`/api/products/${p._id}/reviews`).send({ rating: 3, comment: 'Tạm' });
  assert.equal(second.status, 200);
  const product = await Product.findById(p._id);
  assert.equal(product.ratingCount, 1);
  assert.equal(product.ratingAvg, 3);
  const list = await request(app).get(`/api/products/${p._id}/reviews`);
  assert.equal(list.body.total, 1);
  assert.equal(list.body.items[0].comment, 'Tạm');
  assert.equal(list.body.items[0].user.fullName, 'Test User');
});

test('average is computed across customers', async () => {
  const a = await loginAs();
  const b = await loginAs();
  const p = await createProduct();
  await deliver(await placeOrder(a.user, [[p, 1]]));
  await deliver(await placeOrder(b.user, [[p, 1]]));
  await a.agent.post(`/api/products/${p._id}/reviews`).send({ rating: 5 });
  await b.agent.post(`/api/products/${p._id}/reviews`).send({ rating: 2 });
  const product = await Product.findById(p._id);
  assert.equal(product.ratingCount, 2);
  assert.equal(product.ratingAvg, 3.5);
});

test('rating must be 1-5 and login is required', async () => {
  const { agent, user } = await loginAs();
  const p = await createProduct();
  await deliver(await placeOrder(user, [[p, 1]]));
  assert.equal((await agent.post(`/api/products/${p._id}/reviews`).send({ rating: 6 })).status, 400);
  assert.equal((await request(app).post(`/api/products/${p._id}/reviews`).send({ rating: 5 })).status, 401);
});
