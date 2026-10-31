import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, resetDb, teardown, loginAs, createProduct, createPromotion, addToCart, orderBody } from './helpers.js';
import { Product } from '../src/models/Product.js';
import { Cart } from '../src/models/Cart.js';
import { Order } from '../src/models/Order.js';
import { Promotion } from '../src/models/Promotion.js';

before(setup);
beforeEach(resetDb);
after(teardown);

const FEE = 30_000;

test('COD order: snapshot items, totals, unpaid, stock decremented, cart cleared', async () => {
  const { agent, user } = await loginAs();
  const p = await createProduct({ name: 'iPhone', price: 1_000_000, stock: 5 });
  await addToCart(user._id, [[p, 2]]);
  const res = await agent.post('/api/orders').send(orderBody());
  assert.equal(res.status, 201);
  assert.equal(res.body.status, 'pending');
  assert.equal(res.body.paymentStatus, 'unpaid');
  assert.equal(res.body.subtotal, 2_000_000);
  assert.equal(res.body.shippingFee, FEE);
  assert.equal(res.body.total, 2_000_000 + FEE);
  assert.deepEqual(res.body.items.map((i) => [i.name, i.price, i.quantity]), [['iPhone', 1_000_000, 2]]);
  assert.equal((await Product.findById(p._id)).stock, 3);
  assert.equal((await Cart.findOne({ userId: user._id })).items.length, 0);
});

test('bank order is pending payment and returns transfer info', async () => {
  const { agent, user } = await loginAs();
  const p = await createProduct();
  await addToCart(user._id, [[p, 1]]);
  const res = await agent.post('/api/orders').send(orderBody({ paymentMethod: 'bank' }));
  assert.equal(res.body.paymentStatus, 'pending');
  assert.ok(res.body.paymentInfo.bank.account);
  assert.match(res.body.paymentInfo.transferContent, /^DH[0-9A-F]{8}$/);
});

test('promotion is applied and its usage counted', async () => {
  const { agent, user } = await loginAs();
  const p = await createProduct({ price: 1_000_000 });
  await createPromotion({ code: 'SALE10', value: 10 });
  await addToCart(user._id, [[p, 2]]);
  const res = await agent.post('/api/orders').send(orderBody({ promotionCode: 'sale10' }));
  assert.equal(res.status, 201);
  assert.equal(res.body.discount, 200_000);
  assert.equal(res.body.total, 2_000_000 - 200_000 + FEE);
  assert.equal(res.body.promotionCode, 'SALE10');
  assert.equal((await Promotion.findOne({ code: 'SALE10' })).usedCount, 1);
});

test('empty cart is rejected', async () => {
  const { agent } = await loginAs();
  const res = await agent.post('/api/orders').send(orderBody());
  assert.equal(res.status, 400);
  assert.equal(res.body.code, 'CART_EMPTY');
});

test('out of stock on the second line rolls everything back and keeps the cart', async () => {
  const { agent, user } = await loginAs();
  const a = await createProduct({ stock: 5 });
  const b = await createProduct({ stock: 1 });
  await addToCart(user._id, [[a, 2], [b, 2]]);
  const res = await agent.post('/api/orders').send(orderBody());
  assert.equal(res.status, 409);
  assert.equal(res.body.code, 'OUT_OF_STOCK');
  assert.equal((await Product.findById(a._id)).stock, 5);
  assert.equal((await Product.findById(b._id)).stock, 1);
  assert.equal(await Order.countDocuments(), 0);
  assert.equal((await Cart.findOne({ userId: user._id })).items.length, 2);
});

test('invalid promotion after stock was deducted rolls back the stock', async () => {
  const { agent, user } = await loginAs();
  const p = await createProduct({ stock: 5 });
  await addToCart(user._id, [[p, 2]]);
  const res = await agent.post('/api/orders').send(orderBody({ promotionCode: 'NOPE' }));
  assert.equal(res.status, 400);
  assert.equal(res.body.code, 'PROMO_INVALID');
  assert.equal((await Product.findById(p._id)).stock, 5);
  assert.equal((await Cart.findOne({ userId: user._id })).items.length, 1);
});

test('replaying the same requestKey returns the same order without a second deduction', async () => {
  const { agent, user } = await loginAs();
  const p = await createProduct({ stock: 5 });
  await addToCart(user._id, [[p, 2]]);
  const body = orderBody();
  const first = await agent.post('/api/orders').send(body);
  const second = await agent.post('/api/orders').send(body);
  assert.equal(first.status, 201);
  assert.equal(second.status, 200);
  assert.equal(second.body._id, first.body._id);
  assert.equal((await Product.findById(p._id)).stock, 3);
  assert.equal(await Order.countDocuments(), 1);
});

test('two customers racing for the last unit: exactly one wins, stock never negative', async () => {
  const a = await loginAs();
  const b = await loginAs();
  const p = await createProduct({ stock: 1 });
  await addToCart(a.user._id, [[p, 1]]);
  await addToCart(b.user._id, [[p, 1]]);
  const [ra, rb] = await Promise.all([
    a.agent.post('/api/orders').send(orderBody()),
    b.agent.post('/api/orders').send(orderBody()),
  ]);
  assert.deepEqual([ra.status, rb.status].sort(), [201, 409]);
  assert.equal((await Product.findById(p._id)).stock, 0);
  assert.equal(await Order.countDocuments(), 1);
});

test('validation: bad payment method / missing address', async () => {
  const { agent } = await loginAs();
  assert.equal((await agent.post('/api/orders').send(orderBody({ paymentMethod: 'visa' }))).status, 400);
  assert.equal((await agent.post('/api/orders').send(orderBody({ shippingAddress: {} }))).status, 400);
});

test('admins cannot place orders', async () => {
  const { agent } = await loginAs({ role: 'admin' });
  assert.equal((await agent.post('/api/orders').send(orderBody())).status, 403);
});
