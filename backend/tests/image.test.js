import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app, setup, resetDb, teardown, loginAs } from './helpers.js';

before(setup);
beforeEach(resetDb);
after(teardown);

const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');

test('admin uploads an image and anyone can read it with cache headers', async () => {
  const { agent } = await loginAs({ role: 'admin' });
  const up = await agent.post('/api/images').attach('file', png, { filename: 'a.png', contentType: 'image/png' });
  assert.equal(up.status, 201);
  const res = await request(app).get(`/api/images/${up.body.id}`);
  assert.equal(res.status, 200);
  assert.equal(res.headers['content-type'], 'image/png');
  assert.match(res.headers['cache-control'], /max-age/);
  assert.deepEqual(res.body, png);
});

test('rejects non-image types', async () => {
  const { agent } = await loginAs({ role: 'admin' });
  const res = await agent.post('/api/images').attach('file', Buffer.from('hi'), { filename: 'a.txt', contentType: 'text/plain' });
  assert.equal(res.status, 400);
  assert.equal(res.body.code, 'INVALID_FILE');
});

test('rejects files over 2 MB', async () => {
  const { agent } = await loginAs({ role: 'admin' });
  const big = Buffer.alloc(2 * 1024 * 1024 + 1);
  const res = await agent.post('/api/images').attach('file', big, { filename: 'b.png', contentType: 'image/png' });
  assert.equal(res.status, 413);
});

test('customer cannot upload; unknown id is 404', async () => {
  const { agent } = await loginAs();
  const res = await agent.post('/api/images').attach('file', png, { filename: 'a.png', contentType: 'image/png' });
  assert.equal(res.status, 403);
  assert.equal((await request(app).get('/api/images/aaaaaaaaaaaaaaaaaaaaaaaa')).status, 404);
});
