import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, resetDb, teardown, createUser, createProduct, createPromotion, placeOrder } from './helpers.js';
import { Product } from '../src/models/Product.js';
import { Order } from '../src/models/Order.js';
import { Payment } from '../src/models/Payment.js';
import { Promotion } from '../src/models/Promotion.js';
import {
  ALLOWED_PAYMENT_TRANSITIONS,
  PAYMENT_TO_ORDER_STATUS,
  transitionPaymentState,
  handleLatePaymentException,
  transitionOrderStatus,
} from '../src/services/paymentStateMachine.js';

before(setup);
beforeEach(resetDb);
after(teardown);

test('PENDING_PAYMENT -> PAID releases reservedStock, updates Order, and appends stateHistory', async () => {
  const { user } = await createUser();
  const p = await createProduct({ price: 500_000, stock: 5 });
  const order = await placeOrder(user, [[p, 2]], { paymentMethod: 'bank' });

  const afterCreateProduct = await Product.findById(p._id);
  assert.equal(afterCreateProduct.stock, 3);
  assert.equal(afterCreateProduct.reservedStock, 2);

  const payment = await Payment.findOne({ orderId: order._id });
  assert.equal(payment.status, 'PENDING_PAYMENT');
  assert.equal(payment.expectedAmount, order.total);

  const { payment: paidPayment, order: paidOrder } = await transitionPaymentState({
    paymentId: payment._id,
    targetState: 'PAID',
    reason: 'WEBHOOK_FULL_PAYMENT',
    actor: 'system:webhook',
    providerTxnId: 'txn-001',
    paidAmountDelta: order.total,
    autoConfirmOrder: true,
  });

  assert.equal(paidPayment.status, 'PAID');
  assert.equal(paidPayment.paidAmount, order.total);
  assert.equal(paidPayment.overpaidAmount, 0);
  assert.ok(paidPayment.paidAt);
  assert.equal(paidPayment.stateHistory.at(-1).from, 'PENDING_PAYMENT');
  assert.equal(paidPayment.stateHistory.at(-1).to, 'PAID');
  assert.equal(paidPayment.stateHistory.at(-1).providerTxnId, 'txn-001');

  assert.equal(paidOrder.paymentStatus, PAYMENT_TO_ORDER_STATUS.PAID);
  assert.equal(paidOrder.status, 'confirmed');
  assert.equal(paidOrder.paidAmount, order.total);

  const finalProduct = await Product.findById(p._id);
  assert.equal(finalProduct.stock, 3);
  assert.equal(finalProduct.reservedStock, 0);
});

test('PENDING_PAYMENT -> PARTIALLY_PAID -> PAID holds reservation until full payment', async () => {
  const { user } = await createUser();
  const p = await createProduct({ price: 500_000, stock: 4 });
  const order = await placeOrder(user, [[p, 1]], { paymentMethod: 'bank' });
  const payment = await Payment.findOne({ orderId: order._id });

  const partialRes = await transitionPaymentState({
    paymentId: payment._id,
    targetState: 'PARTIALLY_PAID',
    reason: 'WEBHOOK_PARTIAL_PAYMENT',
    actor: 'system:webhook',
    providerTxnId: 'txn-part-1',
    paidAmountDelta: 200_000,
  });

  assert.equal(partialRes.payment.status, 'PARTIALLY_PAID');
  assert.equal(partialRes.payment.paidAmount, 200_000);
  assert.ok(partialRes.payment.partialGraceExpiresAt);
  assert.equal(partialRes.order.paymentStatus, 'partially_paid');
  assert.equal(partialRes.order.status, 'pending');
  assert.equal((await Product.findById(p._id)).reservedStock, 1);

  const remainingPlusOver = order.total - 200_000 + 50_000;
  const fullRes = await transitionPaymentState({
    paymentId: payment._id,
    targetState: 'PAID',
    reason: 'WEBHOOK_OVERPAYMENT',
    actor: 'system:webhook',
    providerTxnId: 'txn-part-2',
    paidAmountDelta: remainingPlusOver,
    autoConfirmOrder: true,
  });

  assert.equal(fullRes.payment.status, 'PAID');
  assert.equal(fullRes.payment.paidAmount, order.total);
  assert.equal(fullRes.payment.overpaidAmount, 50_000);
  assert.equal(fullRes.order.paymentStatus, 'paid');
  assert.equal(fullRes.order.overpaidAmount, 50_000);
  assert.equal(fullRes.order.status, 'confirmed');
  assert.equal((await Product.findById(p._id)).reservedStock, 0);
});

test('PENDING_PAYMENT -> CANCELLED restores stock, clears reservation, and releases promotion', async () => {
  const { user } = await createUser();
  const p = await createProduct({ price: 1_000_000, stock: 5 });
  await createPromotion({ code: 'SM10', value: 10 });
  const order = await placeOrder(user, [[p, 2]], { paymentMethod: 'bank', promotionCode: 'SM10' });
  const payment = await Payment.findOne({ orderId: order._id });

  assert.equal((await Product.findById(p._id)).stock, 3);
  assert.equal((await Product.findById(p._id)).reservedStock, 2);
  assert.equal((await Promotion.findOne({ code: 'SM10' })).usedCount, 1);

  const res = await transitionPaymentState({
    paymentId: payment._id,
    targetState: 'CANCELLED',
    reason: 'RESERVATION_EXPIRED',
    actor: 'system:ttl_worker',
  });

  assert.equal(res.payment.status, 'CANCELLED');
  assert.equal(res.order.paymentStatus, 'unpaid');
  assert.equal(res.order.status, 'cancelled');
  assert.equal((await Product.findById(p._id)).stock, 5);
  assert.equal((await Product.findById(p._id)).reservedStock, 0);
  assert.equal((await Promotion.findOne({ code: 'SM10' })).usedCount, 0);
});

test('PAID -> REFUNDED and NEED_REFUND -> REFUNDED succeed and record audit metadata', async () => {
  const { user } = await createUser();
  const p = await createProduct({ price: 200_000, stock: 5 });

  const order1 = await placeOrder(user, [[p, 1]], { paymentMethod: 'bank' });
  const pay1 = await Payment.findOne({ orderId: order1._id });
  await transitionPaymentState({
    paymentId: pay1._id,
    targetState: 'PAID',
    reason: 'WEBHOOK_FULL_PAYMENT',
    actor: 'system:webhook',
    paidAmountDelta: order1.total,
    autoConfirmOrder: true,
  });
  const refunded1 = await transitionPaymentState({
    paymentId: pay1._id,
    targetState: 'REFUNDED',
    reason: 'ADMIN_REFUND',
    actor: 'admin:1',
    refundNote: 'Khách yêu cầu hoàn tiền',
  });
  assert.equal(refunded1.payment.status, 'REFUNDED');
  assert.ok(refunded1.payment.refundedAt);
  assert.equal(refunded1.payment.refundNote, 'Khách yêu cầu hoàn tiền');
  assert.equal(refunded1.order.paymentStatus, 'refunded');
  assert.equal(refunded1.order.status, 'cancelled');

  const order2 = await placeOrder(user, [[p, 1]], { paymentMethod: 'bank' });
  const pay2 = await Payment.findOne({ orderId: order2._id });
  await transitionPaymentState({
    paymentId: pay2._id,
    targetState: 'PARTIALLY_PAID',
    reason: 'WEBHOOK_PARTIAL_PAYMENT',
    actor: 'system:webhook',
    paidAmountDelta: 50_000,
  });
  const needRefund = await transitionPaymentState({
    paymentId: pay2._id,
    targetState: 'NEED_REFUND',
    reason: 'PARTIAL_PAYMENT_EXPIRED',
    actor: 'system:ttl_worker',
  });
  assert.equal(needRefund.payment.status, 'NEED_REFUND');
  assert.equal(needRefund.order.paymentStatus, 'need_refund');
  assert.equal((await Product.findById(p._id)).stock, 4);
  assert.equal((await Product.findById(p._id)).reservedStock, 0);

  const refunded2 = await transitionPaymentState({
    paymentId: pay2._id,
    targetState: 'REFUNDED',
    reason: 'ADMIN_REFUND',
    actor: 'admin:1',
    refundNote: 'Hoàn phần tiền chuyển thiếu',
  });
  assert.equal(refunded2.payment.status, 'REFUNDED');
  assert.equal(refunded2.order.paymentStatus, 'refunded');
});

test('forbidden transitions including direct CANCELLED -> PAID throw 409 INVALID_STATE_TRANSITION', async () => {
  assert.equal(ALLOWED_PAYMENT_TRANSITIONS.CANCELLED.includes('PAID'), false);

  const { user } = await createUser();
  const p = await createProduct({ price: 300_000, stock: 5 });
  const order = await placeOrder(user, [[p, 1]], { paymentMethod: 'bank' });
  const payment = await Payment.findOne({ orderId: order._id });

  await assert.rejects(
    () =>
      transitionPaymentState({
        paymentId: payment._id,
        targetState: 'REFUNDED',
        reason: 'INVALID',
        actor: 'admin:1',
      }),
    (err) => err.status === 409 && err.code === 'INVALID_STATE_TRANSITION',
  );

  await transitionPaymentState({
    paymentId: payment._id,
    targetState: 'CANCELLED',
    reason: 'RESERVATION_EXPIRED',
    actor: 'system:ttl_worker',
  });

  await assert.rejects(
    () =>
      transitionPaymentState({
        paymentId: payment._id,
        targetState: 'PAID',
        reason: 'ILLEGAL_DIRECT_RECOVERY',
        actor: 'system:webhook',
        paidAmountDelta: order.total,
      }),
    (err) => err.status === 409 && err.code === 'INVALID_STATE_TRANSITION',
  );

  await transitionPaymentState({
    paymentId: payment._id,
    targetState: 'NEED_REFUND',
    reason: 'LATE_PAYMENT_OUT_OF_STOCK',
    actor: 'system:webhook',
    paidAmountDelta: order.total,
  });
  await transitionPaymentState({
    paymentId: payment._id,
    targetState: 'REFUNDED',
    reason: 'ADMIN_REFUND',
    actor: 'admin:1',
  });

  await assert.rejects(
    () =>
      transitionPaymentState({
        paymentId: payment._id,
        targetState: 'PAID',
        reason: 'ILLEGAL_FROM_REFUNDED',
        actor: 'system:webhook',
        paidAmountDelta: order.total,
      }),
    (err) => err.status === 409 && err.code === 'INVALID_STATE_TRANSITION',
  );
});

test('rejects float and negative money amounts', async () => {
  const { user } = await createUser();
  const p = await createProduct({ price: 100_000, stock: 2 });
  const order = await placeOrder(user, [[p, 1]], { paymentMethod: 'bank' });
  const payment = await Payment.findOne({ orderId: order._id });

  for (const badAmount of [100.5, -1, Number.NaN]) {
    await assert.rejects(
      () =>
        transitionPaymentState({
          paymentId: payment._id,
          targetState: 'PARTIALLY_PAID',
          reason: 'BAD_AMOUNT',
          actor: 'system:webhook',
          paidAmountDelta: badAmount,
        }),
      (err) => err.status === 400 && err.code === 'INVALID_AMOUNT',
    );
  }
});

test('handleLatePaymentException recovers CANCELLED -> PAID when all items are in stock', async () => {
  const { user } = await createUser();
  const p = await createProduct({ price: 400_000, stock: 3 });
  await createPromotion({ code: 'LATE10', value: 10 });
  const order = await placeOrder(user, [[p, 2]], { paymentMethod: 'bank', promotionCode: 'LATE10' });
  const payment = await Payment.findOne({ orderId: order._id });

  await transitionPaymentState({
    paymentId: payment._id,
    targetState: 'CANCELLED',
    reason: 'RESERVATION_EXPIRED',
    actor: 'system:ttl_worker',
  });
  assert.equal((await Product.findById(p._id)).stock, 3);
  assert.equal((await Promotion.findOne({ code: 'LATE10' })).usedCount, 0);

  const result = await handleLatePaymentException({
    paymentId: payment._id,
    transferAmount: order.total,
    providerTxnId: 'txn-late-ok',
    actor: 'system:webhook',
  });

  assert.equal(result.outcome, 'LATE_RECOVERED');
  assert.equal(result.payment.status, 'PAID');
  assert.equal(result.payment.recoveredFromCancelled, true);
  assert.equal(result.payment.stateHistory.at(-1).reason, 'LATE_PAYMENT_RECOVERY');
  assert.equal(result.order.paymentStatus, 'paid');
  assert.equal(result.order.status, 'confirmed');
  assert.equal((await Product.findById(p._id)).stock, 1);
  assert.equal((await Product.findById(p._id)).reservedStock, 0);
  assert.equal((await Promotion.findOne({ code: 'LATE10' })).usedCount, 1);
});

test('handleLatePaymentException aborts cleanly when 2nd item is out of stock (1st item untouched) and records NEED_REFUND', async () => {
  const { user } = await createUser();
  const p1 = await createProduct({ name: 'Item 1', price: 200_000, stock: 5 });
  const p2 = await createProduct({ name: 'Item 2', price: 300_000, stock: 1 });
  const order = await placeOrder(
    user,
    [
      [p1, 2],
      [p2, 1],
    ],
    { paymentMethod: 'bank' },
  );
  const payment = await Payment.findOne({ orderId: order._id });

  await transitionPaymentState({
    paymentId: payment._id,
    targetState: 'CANCELLED',
    reason: 'RESERVATION_EXPIRED',
    actor: 'system:ttl_worker',
  });
  assert.equal((await Product.findById(p1._id)).stock, 5);
  assert.equal((await Product.findById(p2._id)).stock, 1);

  // Another buyer purchases the last unit of p2 while order is cancelled
  await Product.updateOne({ _id: p2._id }, { $set: { stock: 0 } });

  const result = await handleLatePaymentException({
    paymentId: payment._id,
    transferAmount: order.total,
    providerTxnId: 'txn-late-oos',
    actor: 'system:webhook',
  });

  assert.equal(result.outcome, 'LATE_NEED_REFUND');
  assert.equal(result.payment.status, 'NEED_REFUND');
  assert.equal(result.payment.paidAmount, order.total);
  assert.equal(result.payment.recoveredFromCancelled, false);
  assert.equal(result.payment.stateHistory.at(-1).reason, 'LATE_PAYMENT_OUT_OF_STOCK');
  assert.equal(result.order.paymentStatus, 'need_refund');
  assert.equal(result.order.status, 'cancelled');

  // Critical invariant: p1's stock was NOT decremented by the aborted recovery transaction
  assert.equal((await Product.findById(p1._id)).stock, 5);
  assert.equal((await Product.findById(p2._id)).stock, 0);
});

test('transitionOrderStatus enforces bank payment requirement and valid lifecycle transitions', async () => {
  const { user } = await createUser();
  const p = await createProduct({ price: 500_000, stock: 3 });
  const order = await placeOrder(user, [[p, 1]], { paymentMethod: 'bank' });
  const payment = await Payment.findOne({ orderId: order._id });

  await assert.rejects(
    () => transitionOrderStatus(order._id, 'confirmed', { actor: 'admin:1' }),
    (err) => err.status === 409 && err.code === 'PAYMENT_REQUIRED',
  );

  await assert.rejects(
    () => transitionOrderStatus(order._id, 'delivered', { actor: 'admin:1' }),
    (err) => err.status === 409 && err.code === 'INVALID_TRANSITION',
  );

  await transitionPaymentState({
    paymentId: payment._id,
    targetState: 'PAID',
    reason: 'ADMIN_MANUAL_CONFIRM',
    actor: 'admin:1',
    autoConfirmOrder: false,
  });

  const confirmed = await transitionOrderStatus(order._id, 'confirmed', { actor: 'admin:1' });
  assert.equal(confirmed.status, 'confirmed');
  const shipping = await transitionOrderStatus(order._id, 'shipping', { actor: 'admin:1' });
  assert.equal(shipping.status, 'shipping');
  const delivered = await transitionOrderStatus(order._id, 'delivered', { actor: 'admin:1' });
  assert.equal(delivered.status, 'delivered');
  assert.ok(delivered.deliveredAt);
  const reloaded = await Order.findById(order._id);
  assert.ok(reloaded.deliveredAt);
});
