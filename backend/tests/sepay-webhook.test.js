import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {
  app,
  setup,
  resetDb,
  teardown,
  loginAs,
  createProduct,
  createPromotion,
  addToCart,
  orderBody,
  placeOrder,
} from './helpers.js';
import { config } from '../src/config.js';
import { subscribeOrderPaymentUpdates } from '../src/lib/paymentEvents.js';
import { Order } from '../src/models/Order.js';
import { Payment } from '../src/models/Payment.js';
import { PaymentTransaction } from '../src/models/PaymentTransaction.js';
import { Product } from '../src/models/Product.js';
import { Promotion } from '../src/models/Promotion.js';
import { UnmatchedTransaction } from '../src/models/UnmatchedTransaction.js';
import {
  runExpireReservationsOnce,
  runReconcileOnce,
  startPaymentWorkers,
} from '../src/services/sepayService.js';

const TEST_WEBHOOK_KEY = 'sepay-secret-key-for-test-suite-2026';
const ORIGINAL_SEPAY_CONFIG = {
  webhookApiKey: config.sepay.webhookApiKey,
  userApiToken: config.sepay.userApiToken,
  allowedIps: [...config.sepay.allowedIps],
};

function restoreSepayConfig() {
  config.sepay.webhookApiKey = ORIGINAL_SEPAY_CONFIG.webhookApiKey;
  config.sepay.userApiToken = ORIGINAL_SEPAY_CONFIG.userApiToken;
  config.sepay.allowedIps = [...ORIGINAL_SEPAY_CONFIG.allowedIps];
}

function makeSepayPayload(overrides = {}) {
  return {
    id: Math.floor(Math.random() * 1_000_000_000),
    gateway: 'Vietcombank',
    transactionDate: '2026-11-21 12:00:00',
    accountNumber: config.bank.account,
    subAccount: null,
    code: null,
    content: '',
    transferType: 'in',
    description: 'Chuyen khoan ngan hang',
    transferAmount: 500_000,
    referenceCode: 'FT2632500001',
    accumulated: 500_000,
    ...overrides,
  };
}

before(setup);
beforeEach(async () => {
  await resetDb();
  config.sepay.webhookApiKey = TEST_WEBHOOK_KEY;
  config.sepay.userApiToken = '';
  config.sepay.allowedIps = [];
});
after(async () => {
  restoreSepayConfig();
  await teardown();
});

test('webhook security: rejects missing, wrong, unequal-length Apikey (401), bad IP (403), bad payload (400), and ignores out transfers (200)', async () => {
  const payload = makeSepayPayload({ id: 'sec-1', content: 'DH12345678', transferAmount: 100_000 });

  const missing = await request(app).post('/api/webhooks/sepay').send(payload);
  assert.equal(missing.status, 401);

  const shortWrong = await request(app)
    .post('/api/webhooks/sepay')
    .set('Authorization', 'Apikey x')
    .send(payload);
  assert.equal(shortWrong.status, 401);

  const longWrong = await request(app)
    .post('/api/webhooks/sepay')
    .set('Authorization', `Apikey ${'z'.repeat(128)}`)
    .send(payload);
  assert.equal(longWrong.status, 401);

  config.sepay.webhookApiKey = '';
  const unsetServerKey = await request(app)
    .post('/api/webhooks/sepay')
    .set('Authorization', `Apikey ${TEST_WEBHOOK_KEY}`)
    .send(payload);
  assert.equal(unsetServerKey.status, 401);
  config.sepay.webhookApiKey = TEST_WEBHOOK_KEY;

  config.sepay.allowedIps = ['103.1.2.3'];
  const forbiddenIp = await request(app)
    .post('/api/webhooks/sepay')
    .set('Authorization', `Apikey ${TEST_WEBHOOK_KEY}`)
    .send(payload);
  assert.equal(forbiddenIp.status, 403);
  assert.equal(forbiddenIp.body.code, 'FORBIDDEN_IP');

  config.sepay.allowedIps = ['203.0.113.10'];
  const allowedViaProxy = await request(app)
    .post('/api/webhooks/sepay')
    .set('X-Forwarded-For', '203.0.113.10')
    .set('Authorization', `Bearer ${TEST_WEBHOOK_KEY}`)
    .send({ ...payload, transferType: 'out' });
  assert.equal(allowedViaProxy.status, 200);
  assert.equal(allowedViaProxy.body.matchStatus, 'IGNORED_OUTGOING');

  config.sepay.allowedIps = [];
  const floatAmount = await request(app)
    .post('/api/webhooks/sepay')
    .set('Authorization', `Apikey ${TEST_WEBHOOK_KEY}`)
    .send(makeSepayPayload({ id: 'sec-float', transferAmount: 1000.5 }));
  assert.equal(floatAmount.status, 400);

  const negativeAmount = await request(app)
    .post('/api/webhooks/sepay')
    .set('Authorization', `Apikey ${TEST_WEBHOOK_KEY}`)
    .send(makeSepayPayload({ id: 'sec-neg', transferAmount: -5000 }));
  assert.equal(negativeAmount.status, 400);
});

test('happy path: bank order reserves stock, webhook Apikey confirms PAID & order confirmed, releases reservedStock, and emits SSE', async () => {
  const { agent, user } = await loginAs();
  const product = await createProduct({ price: 500_000, stock: 5 });
  await addToCart(user._id, [[product, 2]]);

  const createRes = await agent
    .post('/api/orders')
    .set('Idempotency-Key', 'idem-bank-order-0001')
    .send({
      paymentMethod: 'bank',
      shippingAddress: { fullName: 'Nguyễn An', phone: '0900000000', address: '1 Phố Huế, Hà Nội' },
    });
  assert.equal(createRes.status, 201);
  assert.ok(createRes.body.orderCode);
  assert.ok(createRes.body.paymentInfo.qrUrl.includes('qr.sepay.vn/img'));
  assert.equal(createRes.body.paymentInfo.remainingAmount, createRes.body.total);

  const afterOrderProduct = await Product.findById(product._id);
  assert.equal(afterOrderProduct.stock, 3);
  assert.equal(afterOrderProduct.reservedStock, 2);

  const events = [];
  const unsubscribe = subscribeOrderPaymentUpdates(createRes.body._id, (ev) => events.push(ev));

  const webhookRes = await request(app)
    .post('/api/webhooks/payment')
    .set('Authorization', `Apikey ${TEST_WEBHOOK_KEY}`)
    .send(
      makeSepayPayload({
        id: 9001001,
        content: `MBVCB.123.${createRes.body.orderCode.toLowerCase()}.CT`,
        transferAmount: createRes.body.total,
      }),
    );

  await new Promise((resolve) => setImmediate(resolve));
  unsubscribe();

  assert.equal(webhookRes.status, 200);
  assert.equal(webhookRes.body.ok, true);
  assert.equal(webhookRes.body.matchStatus, 'MATCHED_PAID');
  assert.equal(webhookRes.body.orderCode, createRes.body.orderCode);

  const updatedOrder = await Order.findById(createRes.body._id);
  const updatedPayment = await Payment.findOne({ orderId: updatedOrder._id });
  const updatedProduct = await Product.findById(product._id);
  const recordedTxn = await PaymentTransaction.findOne({ providerTxnId: '9001001' });

  assert.equal(updatedOrder.paymentStatus, 'paid');
  assert.equal(updatedOrder.status, 'confirmed');
  assert.equal(updatedOrder.paidAmount, updatedOrder.total);
  assert.equal(updatedPayment.status, 'PAID');
  assert.equal(updatedPayment.paidAmount, updatedOrder.total);
  assert.equal(updatedProduct.stock, 3);
  assert.equal(updatedProduct.reservedStock, 0);
  assert.equal(recordedTxn.matchStatus, 'MATCHED_PAID');
  assert.equal(events.length, 1);
  assert.equal(events[0].paymentStatus, 'paid');
  assert.equal(events[0].status, 'confirmed');
});

test('duplicate webhook: sequential and concurrent requests with same providerTxnId process only once', async () => {
  const { user } = await createUserAndOrder(500_000);
  const order = user.order;
  const payload = makeSepayPayload({
    id: 'dup-txn-777',
    content: `Thanh toan ${order.orderCode}`,
    transferAmount: order.total,
  });

  const [r1, r2] = await Promise.all([
    request(app).post('/api/webhooks/sepay').set('Authorization', `Apikey ${TEST_WEBHOOK_KEY}`).send(payload),
    request(app).post('/api/webhooks/sepay').set('Authorization', `Apikey ${TEST_WEBHOOK_KEY}`).send(payload),
  ]);
  assert.equal(r1.status, 200);
  assert.equal(r2.status, 200);
  assert.equal([Boolean(r1.body.duplicated), Boolean(r2.body.duplicated)].filter(Boolean).length, 1);

  const r3 = await request(app)
    .post('/api/webhooks/sepay')
    .set('Authorization', `Apikey ${TEST_WEBHOOK_KEY}`)
    .send(payload);
  assert.equal(r3.status, 200);
  assert.equal(r3.body.duplicated, true);

  const payment = await Payment.findOne({ orderId: order._id });
  assert.equal(payment.paidAmount, order.total);
  assert.equal(payment.overpaidAmount, 0);
  assert.equal(await PaymentTransaction.countDocuments({ providerTxnId: 'dup-txn-777' }), 1);
});

test('underpayment transitions to PARTIALLY_PAID, accumulates multiple partial transfers, then completes to PAID', async () => {
  const { agent, user } = await loginAs();
  const product = await createProduct({ price: 970_000, stock: 4 });
  const order = await placeOrder(user, [[product, 1]], { paymentMethod: 'bank' });
  assert.equal(order.total, 1_000_000);

  const first = await request(app)
    .post('/api/webhooks/sepay')
    .set('Authorization', `Apikey ${TEST_WEBHOOK_KEY}`)
    .send(makeSepayPayload({ id: 'part-1', content: order.orderCode, transferAmount: 300_000 }));
  assert.equal(first.status, 200);
  assert.equal(first.body.matchStatus, 'MATCHED_PARTIAL');

  const second = await request(app)
    .post('/api/webhooks/sepay')
    .set('Authorization', `Apikey ${TEST_WEBHOOK_KEY}`)
    .send(makeSepayPayload({ id: 'part-2', content: order.orderCode, transferAmount: 200_000 }));
  assert.equal(second.status, 200);
  assert.equal(second.body.matchStatus, 'MATCHED_PARTIAL');

  const midOrderRes = await agent.get(`/api/orders/${order._id}`);
  assert.equal(midOrderRes.status, 200);
  assert.equal(midOrderRes.body.paymentStatus, 'partially_paid');
  assert.equal(midOrderRes.body.status, 'pending');
  assert.equal(midOrderRes.body.paidAmount, 500_000);
  assert.equal(midOrderRes.body.paymentInfo.remainingAmount, 500_000);
  assert.ok(midOrderRes.body.paymentInfo.qrUrl.includes('amount=500000'));
  assert.equal((await Product.findById(product._id)).reservedStock, 1);

  const third = await request(app)
    .post('/api/webhooks/sepay')
    .set('Authorization', `Apikey ${TEST_WEBHOOK_KEY}`)
    .send(makeSepayPayload({ id: 'part-3', content: order.orderCode, transferAmount: 500_000 }));
  assert.equal(third.status, 200);
  assert.equal(third.body.matchStatus, 'MATCHED_PAID');

  const finalOrder = await Order.findById(order._id);
  const finalPayment = await Payment.findOne({ orderId: order._id });
  assert.equal(finalOrder.paymentStatus, 'paid');
  assert.equal(finalOrder.status, 'confirmed');
  assert.equal(finalOrder.paidAmount, 1_000_000);
  assert.equal(finalPayment.status, 'PAID');
  assert.equal((await Product.findById(product._id)).reservedStock, 0);
});

test('overpayment and subsequent transfer on settled PAID order track overpaidAmount cleanly', async () => {
  const admin = await loginAs({ role: 'admin' });
  const { order } = (await createUserAndOrder(500_000)).user;

  const overRes = await request(app)
    .post('/api/webhooks/sepay')
    .set('Authorization', `Apikey ${TEST_WEBHOOK_KEY}`)
    .send(
      makeSepayPayload({
        id: 'over-1',
        content: order.orderCode,
        transferAmount: order.total + 120_000,
      }),
    );
  assert.equal(overRes.status, 200);
  assert.equal(overRes.body.matchStatus, 'MATCHED_OVERPAID');

  const secondTransfer = await request(app)
    .post('/api/webhooks/sepay')
    .set('Authorization', `Apikey ${TEST_WEBHOOK_KEY}`)
    .send(
      makeSepayPayload({
        id: 'over-2',
        content: order.orderCode,
        transferAmount: 80_000,
      }),
    );
  assert.equal(secondTransfer.status, 200);
  assert.equal(secondTransfer.body.matchStatus, 'ALREADY_SETTLED');

  const updatedOrder = await Order.findById(order._id);
  const updatedPayment = await Payment.findOne({ orderId: order._id });
  assert.equal(updatedOrder.paymentStatus, 'paid');
  assert.equal(updatedOrder.paidAmount, order.total);
  assert.equal(updatedOrder.overpaidAmount, 200_000);
  assert.equal(updatedPayment.overpaidAmount, 200_000);

  const exceptionsRes = await admin.agent.get('/api/admin/payments/exceptions');
  assert.equal(exceptionsRes.status, 200);
  assert.equal(exceptionsRes.body.total, 1);
  assert.equal(exceptionsRes.body.items[0].overpaidAmount, 200_000);
});

test('unmatched content creates UnmatchedTransaction and Admin can reconcile, mark_refunded, or ignore', async () => {
  const customer = await loginAs();
  const admin = await loginAs({ role: 'admin' });
  const product = await createProduct({ price: 470_000, stock: 3 });
  const order = await placeOrder(customer.user, [[product, 1]], { paymentMethod: 'bank' });

  const u1Res = await request(app)
    .post('/api/webhooks/sepay')
    .set('Authorization', `Apikey ${TEST_WEBHOOK_KEY}`)
    .send(makeSepayPayload({ id: 'unmatched-1', content: 'chuyen tien mua may', transferAmount: order.total }));
  assert.equal(u1Res.status, 200);
  assert.equal(u1Res.body.matchStatus, 'UNMATCHED');

  const u2Res = await request(app)
    .post('/api/webhooks/sepay')
    .set('Authorization', `Apikey ${TEST_WEBHOOK_KEY}`)
    .send(makeSepayPayload({ id: 'unmatched-2', content: 'DHFFFFFFFF', transferAmount: 250_000 }));
  assert.equal(u2Res.status, 200);
  assert.equal(u2Res.body.matchStatus, 'UNMATCHED');

  assert.equal((await customer.agent.get('/api/admin/payments/unmatched')).status, 403);

  const listOpen = await admin.agent.get('/api/admin/payments/unmatched?status=OPEN');
  assert.equal(listOpen.status, 200);
  assert.equal(listOpen.body.total, 2);

  const unmatched1 = listOpen.body.items.find((i) => i.providerTxnId === 'unmatched-1');
  const unmatched2 = listOpen.body.items.find((i) => i.providerTxnId === 'unmatched-2');

  const reconcileRes = await admin.agent
    .post(`/api/admin/payments/unmatched/${unmatched1._id}/reconcile`)
    .send({ action: 'match_order', orderId: String(order._id), note: 'Khớp đúng sao kê' });
  assert.equal(reconcileRes.status, 200);
  assert.equal(reconcileRes.body.unmatched.resolutionStatus, 'RESOLVED_MATCHED');
  assert.equal(reconcileRes.body.order.paymentStatus, 'paid');
  assert.equal(reconcileRes.body.order.status, 'confirmed');

  const updatedOrder = await Order.findById(order._id);
  const updatedPayment = await Payment.findOne({ orderId: order._id });
  const updatedTxn = await PaymentTransaction.findOne({ providerTxnId: 'unmatched-1' });
  assert.equal(updatedOrder.paymentStatus, 'paid');
  assert.equal(updatedPayment.status, 'PAID');
  assert.equal(updatedTxn.matchStatus, 'MATCHED_PAID');
  assert.equal(String(updatedTxn.orderId), String(order._id));

  const replayReconcile = await admin.agent
    .post(`/api/admin/payments/unmatched/${unmatched1._id}/reconcile`)
    .send({ action: 'ignore' });
  assert.equal(replayReconcile.status, 409);

  const refundUnmatchedRes = await admin.agent
    .post(`/api/admin/payments/unmatched/${unmatched2._id}/reconcile`)
    .send({ action: 'mark_refunded', note: 'Đã chuyển trả lại khách' });
  assert.equal(refundUnmatchedRes.status, 200);
  assert.equal(refundUnmatchedRes.body.unmatched.resolutionStatus, 'RESOLVED_REFUNDED');
});

test('runExpireReservationsOnce cancels expired PENDING_PAYMENT and moves expired PARTIALLY_PAID to NEED_REFUND', async () => {
  const { user } = await loginAs();
  const p1 = await createProduct({ price: 300_000, stock: 5 });
  const p2 = await createProduct({ price: 400_000, stock: 5 });
  await createPromotion({ code: 'EXP10', value: 10 });

  const expiredPendingOrder = await placeOrder(user, [[p1, 2]], {
    paymentMethod: 'bank',
    promotionCode: 'EXP10',
  });
  const partialOrder = await placeOrder(user, [[p2, 1]], { paymentMethod: 'bank' });
  const activeOrder = await placeOrder(user, [[p1, 1]], { paymentMethod: 'bank' });

  await request(app)
    .post('/api/webhooks/sepay')
    .set('Authorization', `Apikey ${TEST_WEBHOOK_KEY}`)
    .send(makeSepayPayload({ id: 'exp-partial-1', content: partialOrder.orderCode, transferAmount: 100_000 }))
    .expect(200);

  const past = new Date(Date.now() - 60_000);
  const future = new Date(Date.now() + 600_000);
  await Payment.updateOne({ orderId: expiredPendingOrder._id }, { $set: { expiresAt: past } });
  await Payment.updateOne({ orderId: activeOrder._id }, { $set: { expiresAt: future } });
  // Before partial grace expires, partialOrder must NOT be transitioned even if expiresAt is past
  await Payment.updateOne({ orderId: partialOrder._id }, { $set: { expiresAt: past, partialGraceExpiresAt: future } });

  const firstRun = await runExpireReservationsOnce(new Date());
  assert.equal(firstRun.cancelledCount, 1);
  assert.equal(firstRun.needRefundCount, 0);

  // Now move partialGraceExpiresAt into the past
  await Payment.updateOne({ orderId: partialOrder._id }, { $set: { partialGraceExpiresAt: past } });
  const secondRun = await runExpireReservationsOnce(new Date());
  assert.equal(secondRun.cancelledCount, 0);
  assert.equal(secondRun.needRefundCount, 1);

  const cancelledOrder = await Order.findById(expiredPendingOrder._id);
  const needRefundOrder = await Order.findById(partialOrder._id);
  const stillActiveOrder = await Order.findById(activeOrder._id);
  assert.equal(cancelledOrder.status, 'cancelled');
  assert.equal(cancelledOrder.paymentStatus, 'unpaid');
  assert.equal(needRefundOrder.status, 'cancelled');
  assert.equal(needRefundOrder.paymentStatus, 'need_refund');
  assert.equal(stillActiveOrder.status, 'pending');
  assert.equal(stillActiveOrder.paymentStatus, 'pending');

  // Stock & promo restored cleanly; only activeOrder holds 1 unit of p1
  assert.equal((await Product.findById(p1._id)).stock, 4);
  assert.equal((await Product.findById(p1._id)).reservedStock, 1);
  assert.equal((await Product.findById(p2._id)).stock, 5);
  assert.equal((await Product.findById(p2._id)).reservedStock, 0);
  assert.equal((await Promotion.findOne({ code: 'EXP10' })).usedCount, 0);
});

test('late payment webhook on CANCELLED order recovers when in stock, or aborts atomically to NEED_REFUND when OOS', async () => {
  const { user } = await loginAs();
  const p1 = await createProduct({ name: 'Recovery Item', price: 200_000, stock: 3 });
  const p2 = await createProduct({ name: 'OOS Item 2', price: 300_000, stock: 1 });
  await createPromotion({ code: 'LATE20', value: 10 });

  // Case 1: Late payment recovers cleanly
  const orderOk = await placeOrder(user, [[p1, 2]], { paymentMethod: 'bank', promotionCode: 'LATE20' });
  await Payment.updateOne({ orderId: orderOk._id }, { $set: { expiresAt: new Date(Date.now() - 10_000) } });
  await runExpireReservationsOnce(new Date());

  const recoverRes = await request(app)
    .post('/api/webhooks/sepay')
    .set('Authorization', `Apikey ${TEST_WEBHOOK_KEY}`)
    .send(makeSepayPayload({ id: 'late-ok-1', content: orderOk.orderCode, transferAmount: orderOk.total }));
  assert.equal(recoverRes.status, 200);
  assert.equal(recoverRes.body.matchStatus, 'LATE_RECOVERED');

  const dupLateRes = await request(app)
    .post('/api/webhooks/sepay')
    .set('Authorization', `Apikey ${TEST_WEBHOOK_KEY}`)
    .send(makeSepayPayload({ id: 'late-ok-1', content: orderOk.orderCode, transferAmount: orderOk.total }));
  assert.equal(dupLateRes.status, 200);
  assert.equal(dupLateRes.body.duplicated, true);

  const recoveredPayment = await Payment.findOne({ orderId: orderOk._id });
  const recoveredOrder = await Order.findById(orderOk._id);
  assert.equal(recoveredPayment.status, 'PAID');
  assert.equal(recoveredPayment.recoveredFromCancelled, true);
  assert.equal(recoveredOrder.status, 'confirmed');
  assert.equal(recoveredOrder.paymentStatus, 'paid');
  assert.equal((await Product.findById(p1._id)).stock, 1);
  assert.equal((await Promotion.findOne({ code: 'LATE20' })).usedCount, 1);

  // Case 2: 2 items where p1 has stock (1) and p2 is OOS (0) -> abort p1 deduction, record NEED_REFUND
  const orderOos = await placeOrder(
    user,
    [
      [p1, 1],
      [p2, 1],
    ],
    { paymentMethod: 'bank' },
  );
  await Payment.updateOne({ orderId: orderOos._id }, { $set: { expiresAt: new Date(Date.now() - 10_000) } });
  await runExpireReservationsOnce(new Date());

  // p1 stock is 1 again, p2 stock is 1; someone else buys last unit of p2
  await Product.updateOne({ _id: p2._id }, { $set: { stock: 0 } });

  const oosRes = await request(app)
    .post('/api/webhooks/sepay')
    .set('Authorization', `Apikey ${TEST_WEBHOOK_KEY}`)
    .send(makeSepayPayload({ id: 'late-oos-1', content: orderOos.orderCode, transferAmount: orderOos.total }));
  assert.equal(oosRes.status, 200);
  assert.equal(oosRes.body.matchStatus, 'LATE_NEED_REFUND');

  const needRefundOrder = await Order.findById(orderOos._id);
  const needRefundPayment = await Payment.findOne({ orderId: orderOos._id });
  const oosTxn = await PaymentTransaction.findOne({ providerTxnId: 'late-oos-1' });
  assert.equal(needRefundOrder.paymentStatus, 'need_refund');
  assert.equal(needRefundOrder.status, 'cancelled');
  assert.equal(needRefundPayment.status, 'NEED_REFUND');
  assert.equal(oosTxn.matchStatus, 'LATE_NEED_REFUND');
  // Critical: p1 stock stayed untouched at 1!
  assert.equal((await Product.findById(p1._id)).stock, 1);
});

test('admin refund transitions PAID and NEED_REFUND to REFUNDED, and rejects PENDING_PAYMENT (409)', async () => {
  const admin = await loginAs({ role: 'admin' });
  const { user } = await loginAs();
  const p = await createProduct({ price: 400_000, stock: 5 });

  const paidOrder = await placeOrder(user, [[p, 1]], { paymentMethod: 'bank' });
  await request(app)
    .post('/api/webhooks/sepay')
    .set('Authorization', `Apikey ${TEST_WEBHOOK_KEY}`)
    .send(makeSepayPayload({ id: 'ref-paid-1', content: paidOrder.orderCode, transferAmount: paidOrder.total }))
    .expect(200);

  const refundPaidRes = await admin.agent
    .post(`/api/admin/orders/${paidOrder._id}/refund`)
    .send({ note: 'Hoàn tiền theo yêu cầu khách' });
  assert.equal(refundPaidRes.status, 200);
  assert.equal(refundPaidRes.body.paymentStatus, 'refunded');
  assert.equal(refundPaidRes.body.status, 'cancelled');
  assert.equal(refundPaidRes.body.payment.refundNote, 'Hoàn tiền theo yêu cầu khách');

  const doubleRefund = await admin.agent.post(`/api/admin/orders/${paidOrder._id}/refund`).send({});
  assert.equal(doubleRefund.status, 409);

  const pendingOrder = await placeOrder(user, [[p, 1]], { paymentMethod: 'bank' });
  const rejectPending = await admin.agent.post(`/api/admin/orders/${pendingOrder._id}/refund`).send({});
  assert.equal(rejectPending.status, 409);
  assert.equal(rejectPending.body.code, 'INVALID_STATE_TRANSITION');

  // Also verify NEED_REFUND -> REFUNDED (via expired partial payment)
  const partialOrder = await placeOrder(user, [[p, 1]], { paymentMethod: 'bank' });
  await request(app)
    .post('/api/webhooks/sepay')
    .set('Authorization', `Apikey ${TEST_WEBHOOK_KEY}`)
    .send(makeSepayPayload({ id: 'ref-part-1', content: partialOrder.orderCode, transferAmount: 100_000 }))
    .expect(200);
  await Payment.updateOne(
    { orderId: partialOrder._id },
    { $set: { partialGraceExpiresAt: new Date(Date.now() - 10_000) } },
  );
  await runExpireReservationsOnce(new Date());

  const refundNeedRefundRes = await admin.agent
    .post(`/api/admin/orders/${partialOrder._id}/refund`)
    .send({ note: 'Đã hoàn lại tiền cọc' });
  assert.equal(refundNeedRefundRes.status, 200);
  assert.equal(refundNeedRefundRes.body.paymentStatus, 'refunded');
  assert.equal(refundNeedRefundRes.body.status, 'cancelled');
  assert.equal(refundNeedRefundRes.body.payment.refundNote, 'Đã hoàn lại tiền cọc');
});

test('runReconcileOnce catches missed webhook via mocked SePay API and stays idempotent', async () => {
  const skippedNoToken = await runReconcileOnce();
  assert.equal(skippedNoToken.skipped, true);
  assert.equal(skippedNoToken.reason, 'MISSING_USER_API_TOKEN');

  config.sepay.userApiToken = 'test-user-api-token';
  const skippedNoOpen = await runReconcileOnce();
  assert.equal(skippedNoOpen.skipped, true);
  assert.equal(skippedNoOpen.reason, 'NO_OPEN_PAYMENTS');

  const { user } = await loginAs();
  const p = await createProduct({ price: 970_000, stock: 2 });
  const order = await placeOrder(user, [[p, 1]], { paymentMethod: 'bank' });

  let fetchCalls = 0;
  const mockFetch = async (url, init) => {
    fetchCalls += 1;
    assert.ok(url.endsWith('/transactions/list?limit=50'));
    assert.equal(init.headers.Authorization, 'Bearer test-user-api-token');
    return {
      ok: true,
      status: 200,
      json: async () => ({
        transactions: [
          {
            id: 'cron-out-1',
            amount_in: '0.00',
            amount_out: '150000.00',
            transaction_content: 'Rut tien',
            bank_brand_name: 'Vietcombank',
            account_number: config.bank.account,
            reference_number: 'FT001',
            transaction_date: '2026-11-21 12:30:00',
          },
          {
            id: 'cron-in-1',
            amount_in: `${order.total}.00`,
            amount_out: '0.00',
            transaction_content: `THANH TOAN ${order.orderCode}`,
            bank_brand_name: 'Vietcombank',
            account_number: config.bank.account,
            reference_number: 'FT002',
            transaction_date: '2026-11-21 12:31:00',
          },
        ],
      }),
    };
  };

  const firstCron = await runReconcileOnce({ fetchImpl: mockFetch });
  assert.equal(firstCron.skipped, false);
  assert.equal(firstCron.processedCount, 1);
  assert.equal(firstCron.duplicatedCount, 0);
  assert.equal(fetchCalls, 1);

  const settledOrder = await Order.findById(order._id);
  const settledTxn = await PaymentTransaction.findOne({ providerTxnId: 'cron-in-1' });
  assert.equal(settledOrder.paymentStatus, 'paid');
  assert.equal(settledOrder.status, 'confirmed');
  assert.equal(settledTxn.source, 'reconcile_cron');
  assert.equal(settledTxn.matchStatus, 'MATCHED_PAID');

  // After order is settled, openCount is 0 -> skips network call
  const secondCron = await runReconcileOnce({ fetchImpl: mockFetch });
  assert.equal(secondCron.skipped, true);
  assert.equal(secondCron.reason, 'NO_OPEN_PAYMENTS');
  assert.equal(fetchCalls, 1);

  // Even if another open order exists and SePay returns cron-in-1 again, it deduplicates cleanly
  const openOrder2 = await placeOrder(user, [[p, 1]], { paymentMethod: 'bank' });
  assert.ok(openOrder2);
  const thirdCron = await runReconcileOnce({ fetchImpl: mockFetch });
  assert.equal(thirdCron.skipped, false);
  assert.equal(thirdCron.processedCount, 0);
  assert.equal(thirdCron.duplicatedCount, 1);
});

test('startPaymentWorkers does not start timers in test environment', () => {
  const stop = startPaymentWorkers();
  assert.equal(typeof stop, 'function');
  stop();
});

test('0 VND incoming transfer does not transition CANCELLED or PENDING_PAYMENT orders and cannot be matched via reconcileUnmatched', async () => {
  const admin = await loginAs({ role: 'admin' });
  const { user } = await loginAs();
  const p = await createProduct({ price: 470_000, stock: 4 });

  const cancelledOrder = await placeOrder(user, [[p, 1]], { paymentMethod: 'bank' });
  await Payment.updateOne({ orderId: cancelledOrder._id }, { $set: { expiresAt: new Date(Date.now() - 10_000) } });
  await runExpireReservationsOnce(new Date());

  const zeroCancelledRes = await request(app)
    .post('/api/webhooks/sepay')
    .set('Authorization', `Apikey ${TEST_WEBHOOK_KEY}`)
    .send(makeSepayPayload({ id: 'zero-cancelled-1', content: cancelledOrder.orderCode, transferAmount: 0 }));
  assert.equal(zeroCancelledRes.status, 200);
  assert.equal(zeroCancelledRes.body.matchStatus, 'ALREADY_SETTLED');
  assert.equal((await Payment.findOne({ orderId: cancelledOrder._id })).status, 'CANCELLED');
  assert.equal((await Order.findById(cancelledOrder._id)).paymentStatus, 'unpaid');
  assert.equal((await PaymentTransaction.findOne({ providerTxnId: 'zero-cancelled-1' })).matchStatus, 'ALREADY_SETTLED');

  const pendingOrder = await placeOrder(user, [[p, 1]], { paymentMethod: 'bank' });
  const zeroPendingRes = await request(app)
    .post('/api/webhooks/sepay')
    .set('Authorization', `Apikey ${TEST_WEBHOOK_KEY}`)
    .send(makeSepayPayload({ id: 'zero-pending-1', content: pendingOrder.orderCode, transferAmount: 0 }));
  assert.equal(zeroPendingRes.status, 200);
  assert.equal(zeroPendingRes.body.matchStatus, 'ALREADY_SETTLED');
  assert.equal((await Payment.findOne({ orderId: pendingOrder._id })).status, 'PENDING_PAYMENT');

  await request(app)
    .post('/api/webhooks/sepay')
    .set('Authorization', `Apikey ${TEST_WEBHOOK_KEY}`)
    .send(makeSepayPayload({ id: 'zero-unmatched-1', content: 'no code', transferAmount: 0 }))
    .expect(200);
  const zeroUnmatched = await UnmatchedTransaction.findOne({ providerTxnId: 'zero-unmatched-1' });
  const matchZeroRes = await admin.agent
    .post(`/api/admin/payments/unmatched/${zeroUnmatched._id}/reconcile`)
    .send({ action: 'match_order', orderId: String(cancelledOrder._id) });
  assert.equal(matchZeroRes.status, 400);
  assert.equal(matchZeroRes.body.code, 'INVALID_AMOUNT');
  assert.equal((await Payment.findOne({ orderId: cancelledOrder._id })).status, 'CANCELLED');
});

async function createUserAndOrder(price) {
  const { agent, user } = await loginAs();
  const product = await createProduct({ price, stock: 5 });
  const order = await placeOrder(user, [[product, 1]], { paymentMethod: 'bank' });
  return { agent, user: { ...user.toObject(), order } };
}
