import mongoose from 'mongoose';
import { Payment } from '../models/Payment.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { AppError } from '../lib/errors.js';
import { toObjectId } from '../lib/ids.js';
import { config } from '../config.js';
import * as promotionService from './promotionService.js';

export const ALLOWED_PAYMENT_TRANSITIONS = Object.freeze({
  PENDING_PAYMENT: ['PAID', 'PARTIALLY_PAID', 'CANCELLED'],
  PARTIALLY_PAID: ['PAID', 'NEED_REFUND'],
  PAID: ['REFUNDED'],
  NEED_REFUND: ['REFUNDED'],
  CANCELLED: ['NEED_REFUND'],
  REFUNDED: [],
});

export const PAYMENT_TO_ORDER_STATUS = Object.freeze({
  PENDING_PAYMENT: 'pending',
  PARTIALLY_PAID: 'partially_paid',
  PAID: 'paid',
  CANCELLED: 'unpaid',
  NEED_REFUND: 'need_refund',
  REFUNDED: 'refunded',
});

export const ALLOWED_ORDER_TRANSITIONS = Object.freeze({
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipping', 'cancelled'],
  shipping: ['delivered'],
  delivered: [],
  cancelled: [],
});

class LateRecoveryAbortError extends Error {
  constructor(reason) {
    super(reason);
    this.reason = reason;
  }
}

function normalizeObjectId(id) {
  if (id instanceof mongoose.Types.ObjectId) return id;
  return toObjectId(typeof id === 'string' ? id : String(id ?? ''));
}

function assertNonNegativeInt(value, fieldName) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new AppError(400, 'INVALID_AMOUNT', `${fieldName} phải là số nguyên không âm (VNĐ)`);
  }
}

function sortOrderItems(items) {
  return [...(items || [])].sort((a, b) => String(a.productId).localeCompare(String(b.productId)));
}

async function runInTransaction(externalSession, fn) {
  if (externalSession) return fn(externalSession);
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

async function adjustReservedInventory(items, { restoreAvailable, session }) {
  for (const item of sortOrderItems(items)) {
    const inc = restoreAvailable
      ? { stock: item.quantity, reservedStock: -item.quantity }
      : { reservedStock: -item.quantity };
    const updated = await Product.findOneAndUpdate(
      { _id: item.productId, reservedStock: { $gte: item.quantity } },
      { $inc: inc },
      { returnDocument: 'after', session },
    );
    if (!updated) {
      throw new AppError(
        409,
        'RESERVATION_MISMATCH',
        `Không thể cập nhật giữ chỗ tồn kho cho sản phẩm ${String(item.productId)}`,
      );
    }
  }
}

function computePartialGraceDate(payment, partialGraceMinutes) {
  if (partialGraceMinutes !== undefined) {
    assertNonNegativeInt(partialGraceMinutes, 'partialGraceMinutes');
    return new Date(Date.now() + partialGraceMinutes * 60_000);
  }
  const graceMs = config.payment.partialGraceMinutes * 60_000;
  const baseMs = Math.max(Date.now(), payment.expiresAt?.getTime?.() || 0);
  return new Date(baseMs + graceMs);
}

async function buildTransitionPatches(payment, order, opts, session) {
  const { targetState, actor, paidAmountDelta, autoConfirmOrder, refundNote, partialGraceMinutes } = opts;
  const currentStatus = payment.status;
  const nextPaidTotal = payment.paidAmount + paidAmountDelta;

  if (targetState === 'PAID') {
    const isAdminManualConfirm =
      paidAmountDelta === 0 && payment.paidAmount < payment.expectedAmount && String(actor || '').startsWith('admin');
    const effectiveTotal = isAdminManualConfirm ? payment.expectedAmount : nextPaidTotal;
    if (effectiveTotal < payment.expectedAmount) {
      throw new AppError(409, 'INSUFFICIENT_PAYMENT', 'Số tiền thanh toán chưa đủ để xác nhận đã thanh toán');
    }
    const nextPaidAmount = Math.min(payment.expectedAmount, effectiveTotal);
    const nextOverpaidAmount = payment.overpaidAmount + Math.max(0, effectiveTotal - payment.expectedAmount);

    await adjustReservedInventory(order.items, { restoreAvailable: false, session });

    const orderPatch = {
      paymentStatus: PAYMENT_TO_ORDER_STATUS.PAID,
      paidAmount: nextPaidAmount,
      overpaidAmount: nextOverpaidAmount,
    };
    if (autoConfirmOrder && order.status === 'pending') {
      orderPatch.status = 'confirmed';
    }
    return {
      paymentPatch: {
        status: 'PAID',
        paidAmount: nextPaidAmount,
        overpaidAmount: nextOverpaidAmount,
        paidAt: payment.paidAt || new Date(),
      },
      orderPatch,
    };
  }

  if (targetState === 'PARTIALLY_PAID') {
    if (paidAmountDelta <= 0) {
      throw new AppError(400, 'INVALID_AMOUNT', 'Số tiền thanh toán một phần phải lớn hơn 0');
    }
    if (nextPaidTotal >= payment.expectedAmount) {
      throw new AppError(409, 'INVALID_STATE_TRANSITION', 'Số tiền đã đủ, phải chuyển sang trạng thái PAID');
    }
    const paymentPatch = {
      status: 'PARTIALLY_PAID',
      paidAmount: nextPaidTotal,
    };
    if (!payment.partialGraceExpiresAt) {
      paymentPatch.partialGraceExpiresAt = computePartialGraceDate(payment, partialGraceMinutes);
    }
    return {
      paymentPatch,
      orderPatch: {
        paymentStatus: PAYMENT_TO_ORDER_STATUS.PARTIALLY_PAID,
        paidAmount: nextPaidTotal,
      },
    };
  }

  if (targetState === 'CANCELLED') {
    await adjustReservedInventory(order.items, { restoreAvailable: true, session });
    if (order.promotionCode) {
      await promotionService.release(order.promotionCode, session);
    }
    return {
      paymentPatch: { status: 'CANCELLED' },
      orderPatch: {
        paymentStatus: PAYMENT_TO_ORDER_STATUS.CANCELLED,
        status: 'cancelled',
      },
    };
  }

  if (targetState === 'NEED_REFUND') {
    if (currentStatus === 'PARTIALLY_PAID') {
      await adjustReservedInventory(order.items, { restoreAvailable: true, session });
      if (order.promotionCode) {
        await promotionService.release(order.promotionCode, session);
      }
    }
    const nextPaidAmount = Math.min(payment.expectedAmount, nextPaidTotal);
    const nextOverpaidAmount = payment.overpaidAmount + Math.max(0, nextPaidTotal - payment.expectedAmount);
    return {
      paymentPatch: {
        status: 'NEED_REFUND',
        paidAmount: nextPaidAmount,
        overpaidAmount: nextOverpaidAmount,
      },
      orderPatch: {
        paymentStatus: PAYMENT_TO_ORDER_STATUS.NEED_REFUND,
        status: 'cancelled',
        paidAmount: nextPaidAmount,
        overpaidAmount: nextOverpaidAmount,
      },
    };
  }

  return {
    paymentPatch: {
      status: 'REFUNDED',
      refundedAt: new Date(),
      refundNote: refundNote || '',
    },
    orderPatch: {
      paymentStatus: PAYMENT_TO_ORDER_STATUS.REFUNDED,
      status: 'cancelled',
    },
  };
}

/**
 * Centralized payment state transition enforcing ALLOWED_PAYMENT_TRANSITIONS,
 * atomic conditional updates, stock reservation accounting, and audit history.
 * Direct CANCELLED -> PAID transitions are strictly forbidden (use handleLatePaymentException).
 */
export async function transitionPaymentState({
  paymentId,
  targetState,
  reason,
  actor = 'system',
  providerTxnId = null,
  amount = null,
  paidAmountDelta = 0,
  autoConfirmOrder = false,
  refundNote = '',
  partialGraceMinutes,
  session: externalSession,
}) {
  const normalizedPaymentId = normalizeObjectId(paymentId);
  assertNonNegativeInt(paidAmountDelta, 'paidAmountDelta');
  if (amount !== null && amount !== undefined) {
    assertNonNegativeInt(amount, 'amount');
  }
  if (!Object.hasOwn(PAYMENT_TO_ORDER_STATUS, targetState)) {
    throw new AppError(409, 'INVALID_STATE_TRANSITION', `Trạng thái thanh toán đích không hợp lệ: ${targetState}`);
  }

  return runInTransaction(externalSession, async (session) => {
    const payment = await Payment.findById(normalizedPaymentId).session(session);
    if (!payment) {
      throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy thông tin thanh toán');
    }
    const order = await Order.findById(payment.orderId).session(session);
    if (!order) {
      throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy đơn hàng');
    }

    const currentStatus = payment.status;
    const allowed = ALLOWED_PAYMENT_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(targetState)) {
      throw new AppError(
        409,
        'INVALID_STATE_TRANSITION',
        `Không thể chuyển trạng thái thanh toán từ ${currentStatus} sang ${targetState}`,
      );
    }

    const { paymentPatch, orderPatch } = await buildTransitionPatches(
      payment,
      order,
      { targetState, actor, paidAmountDelta, autoConfirmOrder, refundNote, partialGraceMinutes },
      session,
    );

    const historyEntry = {
      from: currentStatus,
      to: targetState,
      reason: reason || `TRANSITION_${currentStatus}_TO_${targetState}`,
      actor: actor || 'system',
      providerTxnId: providerTxnId ? String(providerTxnId) : null,
      amount: amount !== null && amount !== undefined ? amount : paidAmountDelta > 0 ? paidAmountDelta : null,
      timestamp: new Date(),
    };

    const updatedPayment = await Payment.findOneAndUpdate(
      { _id: payment._id, status: currentStatus },
      { $set: paymentPatch, $push: { stateHistory: historyEntry } },
      { returnDocument: 'after', session },
    );
    if (!updatedPayment) {
      throw new AppError(409, 'CONFLICT', 'Trạng thái thanh toán vừa được cập nhật, vui lòng thử lại');
    }

    const updatedOrder = await Order.findOneAndUpdate(
      { _id: order._id },
      { $set: orderPatch },
      { returnDocument: 'after', session },
    );

    return { payment: updatedPayment, order: updatedOrder };
  });
}

/**
 * Exception handler for late incoming payments on CANCELLED bank orders.
 * Runs stock/promo recovery inside an isolated transaction so any out-of-stock item
 * aborts cleanly before recording NEED_REFUND in a separate transaction.
 */
export async function handleLatePaymentException({
  paymentId,
  transferAmount,
  providerTxnId = null,
  actor = 'system:webhook',
}) {
  const normalizedPaymentId = normalizeObjectId(paymentId);
  assertNonNegativeInt(transferAmount, 'transferAmount');

  const initialPayment = await Payment.findById(normalizedPaymentId).lean();
  if (!initialPayment) {
    throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy thông tin thanh toán');
  }
  if (initialPayment.status !== 'CANCELLED') {
    throw new AppError(
      409,
      'INVALID_STATE_TRANSITION',
      `handleLatePaymentException chỉ áp dụng cho đơn CANCELLED, hiện tại là ${initialPayment.status}`,
    );
  }

  if (initialPayment.paidAmount + transferAmount < initialPayment.expectedAmount) {
    const { payment, order } = await transitionPaymentState({
      paymentId: normalizedPaymentId,
      targetState: 'NEED_REFUND',
      reason: 'LATE_PAYMENT_UNDERPAID',
      actor,
      providerTxnId,
      amount: transferAmount,
      paidAmountDelta: transferAmount,
    });
    return { outcome: 'LATE_NEED_REFUND', payment, order };
  }

  let abortReason = null;
  const recoverySession = await mongoose.startSession();
  try {
    let recovered;
    await recoverySession.withTransaction(async () => {
      const payment = await Payment.findOne({ _id: normalizedPaymentId, status: 'CANCELLED' }).session(recoverySession);
      if (!payment) {
        throw new AppError(409, 'CONFLICT', 'Trạng thái thanh toán vừa được cập nhật');
      }
      const order = await Order.findById(payment.orderId).session(recoverySession);
      if (!order) {
        throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy đơn hàng');
      }

      for (const item of sortOrderItems(order.items)) {
        const updatedProduct = await Product.findOneAndUpdate(
          { _id: item.productId, isActive: true, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { returnDocument: 'after', session: recoverySession },
        );
        if (!updatedProduct) {
          throw new LateRecoveryAbortError('LATE_PAYMENT_OUT_OF_STOCK');
        }
      }

      if (order.promotionCode) {
        try {
          await promotionService.consume(order.promotionCode, order.subtotal, recoverySession);
        } catch (promoErr) {
          if (promoErr instanceof AppError && promoErr.code === 'PROMO_INVALID') {
            throw new LateRecoveryAbortError('LATE_PAYMENT_PROMO_EXHAUSTED');
          }
          throw promoErr;
        }
      }

      const nextPaidTotal = payment.paidAmount + transferAmount;
      const nextPaidAmount = Math.min(payment.expectedAmount, nextPaidTotal);
      const nextOverpaidAmount = payment.overpaidAmount + Math.max(0, nextPaidTotal - payment.expectedAmount);

      const updatedPayment = await Payment.findOneAndUpdate(
        { _id: payment._id, status: 'CANCELLED' },
        {
          $set: {
            status: 'PAID',
            recoveredFromCancelled: true,
            paidAmount: nextPaidAmount,
            overpaidAmount: nextOverpaidAmount,
            paidAt: new Date(),
          },
          $push: {
            stateHistory: {
              from: 'CANCELLED',
              to: 'PAID',
              reason: 'LATE_PAYMENT_RECOVERY',
              actor,
              providerTxnId: providerTxnId ? String(providerTxnId) : null,
              amount: transferAmount,
              timestamp: new Date(),
            },
          },
        },
        { returnDocument: 'after', session: recoverySession },
      );
      if (!updatedPayment) {
        throw new AppError(409, 'CONFLICT', 'Trạng thái thanh toán vừa được cập nhật');
      }

      const updatedOrder = await Order.findOneAndUpdate(
        { _id: order._id },
        {
          $set: {
            paymentStatus: PAYMENT_TO_ORDER_STATUS.PAID,
            status: 'confirmed',
            paidAmount: nextPaidAmount,
            overpaidAmount: nextOverpaidAmount,
          },
        },
        { returnDocument: 'after', session: recoverySession },
      );

      recovered = { outcome: 'LATE_RECOVERED', payment: updatedPayment, order: updatedOrder };
    });
    return recovered;
  } catch (err) {
    if (!(err instanceof LateRecoveryAbortError)) throw err;
    abortReason = err.reason;
  } finally {
    await recoverySession.endSession();
  }

  const { payment, order } = await transitionPaymentState({
    paymentId: normalizedPaymentId,
    targetState: 'NEED_REFUND',
    reason: abortReason,
    actor,
    providerTxnId,
    amount: transferAmount,
    paidAmountDelta: transferAmount,
  });
  return { outcome: 'LATE_NEED_REFUND', payment, order };
}

/**
 * Centralized order lifecycle transition validator and executor.
 */
export async function transitionOrderStatus(orderId, nextStatus, { actor = 'admin', session: externalSession } = {}) {
  const normalizedOrderId = normalizeObjectId(orderId);

  return runInTransaction(externalSession, async (session) => {
    const order = await Order.findById(normalizedOrderId).session(session);
    if (!order) {
      throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy đơn hàng');
    }
    const allowed = ALLOWED_ORDER_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw new AppError(409, 'INVALID_TRANSITION', `Không thể chuyển từ ${order.status} sang ${nextStatus}`);
    }

    if (nextStatus === 'confirmed' && order.paymentMethod === 'bank' && order.paymentStatus !== 'paid') {
      throw new AppError(409, 'PAYMENT_REQUIRED', 'Đơn chuyển khoản cần xác nhận đã thanh toán trước');
    }

    if (nextStatus === 'cancelled') {
      if (order.paymentStatus === 'paid') {
        throw new AppError(409, 'CANNOT_CANCEL', 'Không thể hủy đơn hàng ở trạng thái này');
      }
      const payment = await Payment.findOne({ orderId: order._id }).session(session);
      if (payment) {
        if (payment.status !== 'PENDING_PAYMENT' && payment.status !== 'PARTIALLY_PAID') {
          throw new AppError(409, 'CANNOT_CANCEL', 'Không thể hủy đơn hàng ở trạng thái này');
        }
        const targetState = payment.status === 'PARTIALLY_PAID' ? 'NEED_REFUND' : 'CANCELLED';
        const reason = targetState === 'NEED_REFUND' ? 'ORDER_CANCELLED_PARTIAL' : 'ORDER_CANCELLED';
        const { order: updatedOrder } = await transitionPaymentState({
          paymentId: payment._id,
          targetState,
          reason,
          actor,
          session,
        });
        return updatedOrder;
      }

      const cancelled = await Order.findOneAndUpdate(
        { _id: order._id, status: { $in: ['pending', 'confirmed'] }, paymentStatus: { $ne: 'paid' } },
        { status: 'cancelled' },
        { returnDocument: 'after', session },
      );
      if (!cancelled) {
        throw new AppError(409, 'CANNOT_CANCEL', 'Không thể hủy đơn hàng ở trạng thái này');
      }
      for (const item of sortOrderItems(cancelled.items)) {
        await Product.updateOne({ _id: item.productId }, { $inc: { stock: item.quantity } }, { session });
      }
      if (cancelled.promotionCode) {
        await promotionService.release(cancelled.promotionCode, session);
      }
      return cancelled;
    }

    const patch = { status: nextStatus };
    if (nextStatus === 'delivered') {
      patch.deliveredAt = new Date();
    }
    const updated = await Order.findOneAndUpdate(
      { _id: order._id, status: order.status },
      { $set: patch },
      { returnDocument: 'after', session },
    );
    if (!updated) {
      throw new AppError(409, 'CONFLICT', 'Đơn hàng vừa được cập nhật, vui lòng tải lại');
    }
    return updated;
  });
}
