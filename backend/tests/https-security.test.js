import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app, setup, resetDb, teardown } from './helpers.js';
import { createApp } from '../src/app.js';

before(setup);
beforeEach(resetDb);
after(teardown);

test('sets OWASP security headers on all responses and HSTS when request is HTTPS via proxy', async () => {
  const httpRes = await request(app).get('/api/health');
  assert.equal(httpRes.status, 200);
  assert.equal(httpRes.headers['x-content-type-options'], 'nosniff');
  assert.equal(httpRes.headers['x-frame-options'], 'DENY');
  assert.equal(httpRes.headers['referrer-policy'], 'strict-origin-when-cross-origin');
  assert.equal(httpRes.headers['strict-transport-security'], undefined);

  const httpsRes = await request(app)
    .get('/api/health')
    .set('X-Forwarded-Proto', 'https, http');
  assert.equal(httpsRes.status, 200);
  assert.match(httpsRes.headers['strict-transport-security'], /max-age=31536000/);
});

test('sets Secure flag on auth cookie when accessed via HTTPS proxy', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .set('X-Forwarded-Proto', 'https')
    .send({ email: 'sec@example.com', password: 'password123', fullName: 'Secure User' });
  assert.equal(res.status, 201);
  const cookie = (res.headers['set-cookie'] || []).join('; ');
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /Secure/i);
});

test('FORCE_HTTPS redirects plain HTTP to HTTPS with 308 except /api/health', async () => {
  const forcedApp = createApp({ forceHttps: true });

  const health = await request(forcedApp).get('/api/health').set('Host', 'shop.example.com');
  assert.equal(health.status, 200);

  const redir = await request(forcedApp).get('/api/products?page=1').set('Host', 'shop.example.com');
  assert.equal(redir.status, 308);
  assert.equal(redir.headers.location, 'https://shop.example.com/api/products?page=1');

  const allowedHttps = await request(forcedApp)
    .get('/api/products')
    .set('Host', 'shop.example.com')
    .set('X-Forwarded-Proto', 'https');
  assert.equal(allowedHttps.status, 200);
});
