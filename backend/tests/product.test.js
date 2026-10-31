import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app, setup, resetDb, teardown, loginAs, createCategory, createProduct } from './helpers.js';

before(setup);
beforeEach(resetDb);
after(teardown);

test('search matches partial name case-insensitively and escapes regex chars', async () => {
  await createProduct({ name: 'iPhone 15 Pro' });
  await createProduct({ name: 'Galaxy S24', brand: 'Samsung' });
  const res = await request(app).get('/api/products?q=IPHO');
  assert.equal(res.body.total, 1);
  assert.equal(res.body.items[0].name, 'iPhone 15 Pro');
  assert.equal((await request(app).get('/api/products?q=(')).status, 200);
});

test('filters by category, brand and price range; sorts by price', async () => {
  const phones = await createCategory('Điện thoại');
  const laptops = await createCategory('Laptop');
  await createProduct({ name: 'A', categoryId: phones._id, price: 5_000_000 });
  await createProduct({ name: 'B', categoryId: phones._id, price: 20_000_000, brand: 'Samsung' });
  await createProduct({ name: 'C', categoryId: laptops._id, price: 30_000_000 });

  const byCat = await request(app).get(`/api/products?category=${phones._id}&sort=price_desc`);
  assert.deepEqual(byCat.body.items.map((p) => p.name), ['B', 'A']);
  const byBrand = await request(app).get('/api/products?brand=samsung');
  assert.deepEqual(byBrand.body.items.map((p) => p.name), ['B']);
  const byPrice = await request(app).get('/api/products?minPrice=10000000&maxPrice=25000000');
  assert.deepEqual(byPrice.body.items.map((p) => p.name), ['B']);
});

test('paginates', async () => {
  for (let i = 0; i < 5; i++) await createProduct({ name: `P${i}` });
  const res = await request(app).get('/api/products?pageSize=2&page=3');
  assert.equal(res.body.total, 5);
  assert.equal(res.body.items.length, 1);
});

test('inactive products are hidden publicly but visible to admin', async () => {
  const p = await createProduct({ isActive: false });
  assert.equal((await request(app).get('/api/products')).body.total, 0);
  assert.equal((await request(app).get(`/api/products/${p._id}`)).status, 404);
  const { agent } = await loginAs({ role: 'admin' });
  assert.equal((await agent.get('/api/admin/products')).body.total, 1);
});

test('admin creates, updates and archives a product', async () => {
  const { agent } = await loginAs({ role: 'admin' });
  const cat = await createCategory();
  const body = {
    name: 'MacBook Air', categoryId: String(cat._id), brand: 'Apple',
    price: 25_000_000, stock: 5, specs: { RAM: '16GB' },
  };
  const created = await agent.post('/api/products').send(body);
  assert.equal(created.status, 201);
  assert.equal(created.body.specs.RAM, '16GB');
  const id = created.body._id;
  const updated = await agent.put(`/api/products/${id}`).send({ price: 24_000_000 });
  assert.equal(updated.body.price, 24_000_000);
  await agent.delete(`/api/products/${id}`).expect(204);
  assert.equal((await request(app).get(`/api/products/${id}`)).status, 404);
});

test('validation: negative price and unknown category are rejected', async () => {
  const { agent } = await loginAs({ role: 'admin' });
  const cat = await createCategory();
  const base = { name: 'X', categoryId: String(cat._id), brand: 'B', price: 1, stock: 1 };
  assert.equal((await agent.post('/api/products').send({ ...base, price: -1 })).status, 400);
  const bad = await agent.post('/api/products').send({ ...base, categoryId: 'aaaaaaaaaaaaaaaaaaaaaaaa' });
  assert.equal(bad.status, 400);
  assert.equal(bad.body.code, 'CATEGORY_NOT_FOUND');
});

test('customers cannot write products; brands endpoint lists distinct brands', async () => {
  const { agent } = await loginAs();
  assert.equal((await agent.post('/api/products').send({})).status, 403);
  await createProduct({ brand: 'Apple' });
  await createProduct({ brand: 'Apple' });
  await createProduct({ brand: 'Dell' });
  const res = await request(app).get('/api/brands');
  assert.deepEqual(res.body, ['Apple', 'Dell']);
});
