import { EventEmitter } from 'node:events';

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

function orderChannel(orderId) {
  return `order:${String(orderId)}`;
}

/**
 * Broadcasts a payment or order status update to active SSE listeners for an order.
 */
export function emitOrderPaymentUpdate(orderId, payload) {
  emitter.emit(orderChannel(orderId), payload);
}

/**
 * Subscribes a listener to real-time updates for an order and returns an unsubscribe function.
 */
export function subscribeOrderPaymentUpdates(orderId, listener) {
  const channel = orderChannel(orderId);
  emitter.on(channel, listener);
  return () => {
    emitter.off(channel, listener);
  };
}

/**
 * Builds a consistent SSE `payment_update` event payload from Order and Payment documents.
 */
export function buildOrderPaymentEventPayload(order, payment = null) {
  const expectedAmount = payment?.expectedAmount ?? order.total;
  const paidAmount = payment?.paidAmount ?? order.paidAmount ?? 0;
  const overpaidAmount = payment?.overpaidAmount ?? order.overpaidAmount ?? 0;
  return {
    orderId: String(order._id),
    orderCode: order.orderCode ?? payment?.orderCode ?? null,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentState: payment?.status ?? null,
    expectedAmount,
    paidAmount,
    overpaidAmount,
    remainingAmount: Math.max(0, expectedAmount - paidAmount),
    expiresAt: payment?.expiresAt ?? order.paymentExpiresAt ?? null,
    partialGraceExpiresAt: payment?.partialGraceExpiresAt ?? null,
    paidAt: payment?.paidAt ?? null,
    refundedAt: payment?.refundedAt ?? null,
    recoveredFromCancelled: Boolean(payment?.recoveredFromCancelled),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Schedules non-blocking post-commit side effects after the current HTTP response flushes.
 */
export function enqueueAsyncTask(label, fn) {
  setImmediate(() => {
    Promise.resolve()
      .then(fn)
      .catch((err) => {
        console.error(`[async:${label}]`, err);
      });
  });
}
