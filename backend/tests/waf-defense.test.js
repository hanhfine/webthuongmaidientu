import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app, setup, resetDb, teardown, loginAs, createProduct, placeOrder } from './helpers.js';
import { createApp } from '../src/app.js';
import { Order } from '../src/models/Order.js';
import { isValidLuhn, containsValidCreditCard } from '../src/middleware/wafDefense.js';

before(setup);
beforeEach(resetDb);
after(teardown);

test('WAF Honeypot: blocks bots that populate hidden fake form fields on register/login/orders', async () => {
  const regBot = await request(app).post('/api/auth/register').send({
    email: 'bot@spam.local',
    password: 'password123',
    fullName: 'Bot User',
    website_url: 'https://spam-bot.example',
  });
  assert.equal(regBot.status, 403);
  assert.equal(regBot.body.code, 'BOT_DETECTED');

  const loginBot = await request(app).post('/api/auth/login').send({
    email: 'bot@spam.local',
    password: 'password123',
    hp_company: 'EvilCorp',
  });
  assert.equal(loginBot.status, 403);
  assert.equal(loginBot.body.code, 'BOT_DETECTED');

  // Empty honeypot field (normal human user) passes cleanly
  const humanReg = await request(app).post('/api/auth/register').send({
    email: 'human@shop.local',
    password: 'password123',
    fullName: 'Nguyen Van A',
    website_url: '',
  });
  assert.equal(humanReg.status, 201);
});

test('WAF Scanner Tarpit: blocks automated vulnerability scanner User-Agents with 403', async () => {
  for (const ua of ['sqlmap/1.7.8#stable', 'Mozilla/5.0 (compatible; Nikto/2.1.6)', 'Nmap Scripting Engine']) {
    const res = await request(app).get('/api/products').set('User-Agent', ua);
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'SCANNER_BLOCKED');
  }

  // Normal browser User-Agent passes cleanly
  const normal = await request(app)
    .get('/api/products')
    .set('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0');
  assert.equal(normal.status, 200);
});

test('WAF DLP (@verifyCC / Luhn): detects valid Visa/Mastercard PANs and ignores invalid/timestamps', async () => {
  assert.equal(isValidLuhn('4532015112830366'), true);
  assert.equal(isValidLuhn('4532015112830367'), false);
  assert.equal(containsValidCreditCard('So the: 4532-0151-1283-0366'), true);
  assert.equal(containsValidCreditCard('Timestamp: 1795282798953'), false);

  // If a review accidentally leaks a valid Luhn Visa PAN, DLP blocks the outgoing response with 403
  const { agent, user } = await loginAs();
  const p = await createProduct();
  const order = await placeOrder(user, [[p, 1]]);
  await Order.updateOne({ _id: order._id }, { status: 'delivered', deliveredAt: new Date() });

  const leakRes = await agent.post(`/api/products/${p._id}/reviews`).send({
    rating: 5,
    comment: 'The cua toi la 4532 0151 1283 0366 hay lien he',
  });
  assert.equal(leakRes.status, 403);
  assert.equal(leakRes.body.code, 'DLP_LEAKAGE_BLOCKED');
});

test('WAF Rate Limiter: throttles rapid brute-force attempts on /api/auth/login with 429', async () => {
  const limitedApp = createApp({ enableRateLimit: true, tarpitMs: 0 });
  let lastRes;
  for (let i = 0; i < 16; i += 1) {
    lastRes = await request(limitedApp)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.local', password: 'wrongpassword' });
  }
  assert.equal(lastRes.status, 429);
  assert.equal(lastRes.body.code, 'TOO_MANY_REQUESTS');
  assert.ok(lastRes.headers['retry-after']);
});
