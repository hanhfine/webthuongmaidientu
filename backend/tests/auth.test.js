import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app, setup, resetDb, teardown, createUser, loginAs } from './helpers.js';

before(setup);
beforeEach(resetDb);
after(teardown);

const valid = { email: 'An@Example.com', password: 'password123', fullName: 'Nguyễn An' };

test('register creates a customer without exposing passwordHash', async () => {
  const res = await request(app).post('/api/auth/register').send(valid);
  assert.equal(res.status, 201);
  assert.equal(res.body.email, 'an@example.com');
  assert.equal(res.body.role, 'customer');
  assert.equal(res.body.passwordHash, undefined);
});

test('register ignores a role field in the body', async () => {
  const res = await request(app).post('/api/auth/register').send({ ...valid, role: 'admin' });
  assert.equal(res.status, 201);
  assert.equal(res.body.role, 'customer');
});

test('register rejects duplicate email regardless of case', async () => {
  await request(app).post('/api/auth/register').send(valid);
  const res = await request(app).post('/api/auth/register').send({ ...valid, email: 'an@example.COM' });
  assert.equal(res.status, 409);
  assert.equal(res.body.code, 'EMAIL_TAKEN');
});

test('register validates password length', async () => {
  const res = await request(app).post('/api/auth/register').send({ ...valid, password: 'short' });
  assert.equal(res.status, 400);
  assert.equal(res.body.code, 'VALIDATION');
  assert.ok(res.body.fieldErrors.password);
});

test('login sets an httpOnly cookie and /me returns the user', async () => {
  const { email, password } = await createUser();
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ email, password });
  assert.equal(res.status, 200);
  assert.match(res.headers['set-cookie'][0], /token=.*HttpOnly/i);
  const me = await agent.get('/api/auth/me');
  assert.equal(me.status, 200);
  assert.equal(me.body.email, email);
});

test('login rejects a wrong password', async () => {
  const { email } = await createUser();
  const res = await request(app).post('/api/auth/login').send({ email, password: 'wrong-password' });
  assert.equal(res.status, 401);
  assert.equal(res.body.code, 'INVALID_CREDENTIALS');
});

test('login rejects a locked account', async () => {
  const { email, password } = await createUser({ isActive: false });
  const res = await request(app).post('/api/auth/login').send({ email, password });
  assert.equal(res.status, 403);
  assert.equal(res.body.code, 'ACCOUNT_LOCKED');
});

test('/me requires authentication', async () => {
  const res = await request(app).get('/api/auth/me');
  assert.equal(res.status, 401);
});

test('a session stops working once the account is locked', async () => {
  const { agent, user } = await loginAs();
  user.isActive = false;
  await user.save();
  const res = await agent.get('/api/auth/me');
  assert.equal(res.status, 401);
});

test('logout clears the cookie', async () => {
  const { agent } = await loginAs();
  await agent.post('/api/auth/logout').expect(204);
  const res = await agent.get('/api/auth/me');
  assert.equal(res.status, 401);
});
