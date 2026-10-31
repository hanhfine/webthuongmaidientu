import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app, setup, resetDb, teardown, loginAs, createCategory } from './helpers.js';

before(setup);
beforeEach(resetDb);
after(teardown);

test('admin creates a category and public list shows it', async () => {
  const { agent } = await loginAs({ role: 'admin' });
  const created = await agent.post('/api/categories').send({ name: 'Điện thoại' });
  assert.equal(created.status, 201);
  assert.equal(created.body.slug, 'dien-thoai');
  const list = await request(app).get('/api/categories');
  assert.equal(list.status, 200);
  assert.deepEqual(list.body.map((c) => c.name), ['Điện thoại']);
});

test('duplicate category name returns 409', async () => {
  const { agent } = await loginAs({ role: 'admin' });
  await agent.post('/api/categories').send({ name: 'Laptop' });
  const res = await agent.post('/api/categories').send({ name: 'Laptop' });
  assert.equal(res.status, 409);
});

test('customer cannot create a category, anonymous gets 401', async () => {
  const { agent } = await loginAs();
  assert.equal((await agent.post('/api/categories').send({ name: 'X' })).status, 403);
  assert.equal((await request(app).post('/api/categories').send({ name: 'X' })).status, 401);
});

test('DELETE archives: hidden from public list, visible in admin list', async () => {
  const { agent } = await loginAs({ role: 'admin' });
  const cat = await createCategory('Phụ kiện');
  await agent.delete(`/api/categories/${cat._id}`).expect(204);
  assert.equal((await request(app).get('/api/categories')).body.length, 0);
  assert.equal((await agent.get('/api/admin/categories')).body.length, 1);
});

test('PUT renames and updates slug', async () => {
  const { agent } = await loginAs({ role: 'admin' });
  const cat = await createCategory('Cũ');
  const res = await agent.put(`/api/categories/${cat._id}`).send({ name: 'Mới' });
  assert.equal(res.status, 200);
  assert.equal(res.body.slug, 'moi');
});
