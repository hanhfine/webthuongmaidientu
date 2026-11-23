import mongoose from 'mongoose';
import { Cart } from '../models/Cart.js';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { AppError } from '../lib/errors.js';
import { config } from '../config.js';
import { toObjectId } from '../lib/ids.js';
import { buildOrderPaymentEventPayload, emitOrderPaymentUpdate } from '../lib/paymentEvents.js';
import * as promotionService from './promotionService.js';
import { transitionOrderStatus, transitionPaymentState } from './paymentStateMachine.js';

function assertSafeMoneyInt(value, fieldName) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new AppError(400, 'INVALID_AMOUNT', `${fieldName} phải là số nguyên không âm (VNĐ)`);
  }
}

export function buildOrderCode(orderId) {
  return `DH${String(orderId).slice(-8).toUpperCase()}`;
}

export function toResult(order, payment = null) {
  const obj = order.toObject ? order.toObject() : order;
  const paymentObj = payment?.toObject ? payment.toObject() : payment;
  const paymentInfo = { method: obj.paymentMethod };

  if (obj.paymentMethod === 'bank') {
    const transferContent = obj.orderCode || buildOrderCode(obj._id);
    const expectedAmount = paymentObj?.expectedAmount ?? obj.total;
    const paidAmount = paymentObj?.paidAmount ?? obj.paidAmount ?? 0;
    const overpaidAmount = paymentObj?.overpaidAmount ?? obj.overpaidAmount ?? 0;
    const remainingAmount = Math.max(0, expectedAmount - paidAmount);
    const qrAmount = remainingAmount > 0 ? remainingAmount : expectedAmount;
    const qrParams = new URLSearchParams({
      acc: config.bank.account,
      bank: config.bank.code,
      amount: String(qrAmount),
      des: transferContent,
    });

    paymentInfo.bank = config.bank;
    paymentInfo.transferContent = transferContent;
    paymentInfo.qrUrl = `https://qr.sepay.vn/img?${qrParams.toString()}`;
    paymentInfo.expiresAt = paymentObj?.expiresAt ?? obj.paymentExpiresAt ?? null;
    paymentInfo.partialGraceExpiresAt = paymentObj?.partialGraceExpiresAt ?? null;
    paymentInfo.expectedAmount = expectedAmount;
    paymentInfo.paidAmount = paidAmount;
    paymentInfo.overpaidAmount = overpaidAmount;
    paymentInfo.remainingAmount = remainingAmount;
    paymentInfo.status = paymentObj?.status ?? null;
  }

  const result = { ...obj, paymentInfo };
  if (paymentObj) {
    result.payment = {
      _id: paymentObj._id,
      orderCode: paymentObj.orderCode,
      status: paymentObj.status,
      expectedAmount: paymentObj.expectedAmount,
      paidAmount: paymentObj.paidAmount,
      overpaidAmount: paymentObj.overpaidAmount,
      expiresAt: paymentObj.expiresAt,
      partialGraceExpiresAt: paymentObj.partialGraceExpiresAt ?? null,
      paidAt: paymentObj.paidAt ?? null,
      refundedAt: paymentObj.refundedAt ?? null,
      refundNote: paymentObj.refundNote ?? '',
      recoveredFromCancelled: Boolean(paymentObj.recoveredFromCancelled),
    };
  }
  return result;
}

export async function getPaymentForOrder(orderId) {
  return Payment.findOne({ orderId }).lean();
}

export async function create(userId, input) {
  const { requestKey, paymentMethod, shippingAddress, promotionCode } = input;

  const existing = await Order.findOne({ userId, requestKey });
  if (existing) {
    const existingPayment = existing.paymentMethod === 'bank' ? await getPaymentForOrder(existing._id) : null;
    return { order: existing, payment: existingPayment, created: false };
  }

  const session = await mongoose.startSession();
  try {
    let order;
    let payment = null;
    let replayed = false;
    await session.withTransaction(async () => {
      // A retried transaction (write conflict) may find the order a concurrent identical request created.
      replayed = false;
      payment = null;
      const prior = await Order.findOne({ userId, requestKey }).session(session);
      if (prior) {
        order = prior;
        payment = prior.paymentMethod === 'bank' ? await Payment.findOne({ orderId: prior._id }).session(session) : null;
        replayed = true;
        return;
      }

      const cart = await Cart.findOne({ userId }).session(session);
      if (!cart || cart.items.length === 0) {
        throw new AppError(400, 'CART_EMPTY', 'Giỏ hàng trống');
      }

      // Deterministic lock order avoids deadlock-style write conflicts between concurrent orders.
      const sorted = [...cart.items].sort((a, b) => String(a.productId).localeCompare(String(b.productId)));
      const lines = [];
      for (const item of sorted) {
        const incPatch =
          paymentMethod === 'bank'
            ? { stock: -item.quantity, reservedStock: item.quantity }
            : { stock: -item.quantity };
        const product = await Product.findOneAndUpdate(
          { _id: item.productId, isActive: true, stock: { $gte: item.quantity } },
          { $inc: incPatch },
          { returnDocument: 'after', session },
        );
        if (!product) {
          const current = await Product.findById(item.productId).session(session);
          const msg =
            current && !current.isActive
              ? `Sản phẩm "${current.name}" đã ngừng kinh doanh`
              : `Sản phẩm "${current?.name ?? item.productId}" không đủ hàng`;
          throw new AppError(409, 'OUT_OF_STOCK', msg);
        }
        assertSafeMoneyInt(product.price, 'product.price');
        lines.push({ productId: product._id, name: product.name, price: product.price, quantity: item.quantity });
      }

      const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
      let discount = 0;
      let appliedCode;
      if (promotionCode) {
        const promo = await promotionService.consume(promotionCode, subtotal, session);
        discount = promotionService.computeDiscount(promo, subtotal);
        appliedCode = promo.code;
      }
      const shippingFee = config.shippingFee;
      const total = subtotal - discount + shippingFee;
      assertSafeMoneyInt(subtotal, 'subtotal');
      assertSafeMoneyInt(discount, 'discount');
      assertSafeMoneyInt(shippingFee, 'shippingFee');
      assertSafeMoneyInt(total, 'total');

      const orderId = new mongoose.Types.ObjectId();
      const orderCode = buildOrderCode(orderId);
      const paymentExpiresAt =
        paymentMethod === 'bank' ? new Date(Date.now() + config.payment.reservationMinutes * 60_000) : null;

      [order] = await Order.create(
        [
          {
            _id: orderId,
            userId,
            requestKey,
            orderCode,
            items: lines,
            shippingAddress,
            subtotal,
            discount,
            shippingFee,
            total,
            promotionCode: appliedCode,
            paymentMethod,
            paymentStatus: paymentMethod === 'cod' ? 'unpaid' : 'pending',
            paymentExpiresAt,
            paidAmount: 0,
            overpaidAmount: 0,
          },
        ],
        { session },
      );

      if (paymentMethod === 'bank') {
        [payment] = await Payment.create(
          [
            {
              orderId,
              orderCode,
              userId,
              provider: 'sepay',
              expectedAmount: total,
              paidAmount: 0,
              overpaidAmount: 0,
              status: 'PENDING_PAYMENT',
              expiresAt: paymentExpiresAt,
              partialGraceExpiresAt: null,
              stateHistory: [
                {
                  from: null,
                  to: 'PENDING_PAYMENT',
                  reason: 'ORDER_CREATED',
                  actor: `user:${String(userId)}`,
                  providerTxnId: null,
                  amount: total,
                  timestamp: new Date(),
                },
              ],
            },
          ],
          { session },
        );
      }

      await Cart.updateOne({ userId }, { $set: { items: [] } }, { session });
    });
    return { order, payment, created: !replayed };
  } catch (err) {
    if (err?.code === 11000) {
      const dup = await Order.findOne({ userId, requestKey });
      if (dup) {
        const dupPayment = dup.paymentMethod === 'bank' ? await getPaymentForOrder(dup._id) : null;
        return { order: dup, payment: dupPayment, created: false };
      }
    }
    throw err;
  } finally {
    await session.endSession();
  }
}

async function page(filter, { page: pageNo = 1, pageSize = 10 } = {}) {
  const [items, total] = await Promise.all([
    Order.find(filter).sort('-createdAt').skip((pageNo - 1) * pageSize).limit(pageSize).lean(),
    Order.countDocuments(filter),
  ]);
  return { items, total, page: pageNo, pageSize };
}

export const listMine = (userId, opts) => page({ userId }, opts);
export const listAll = ({ status, ...opts } = {}) => page(status ? { status } : {}, opts);

export async function getMine(userId, id) {
  const order = await Order.findOne({ _id: toObjectId(id), userId }).lean();
  if (!order) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy đơn hàng');
  return order;
}

export async function getById(id) {
  const order = await Order.findById(toObjectId(id)).lean();
  if (!order) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy đơn hàng');
  return order;
}

export async function cancel(id, { userId, actor } = {}) {
  const filter = { _id: toObjectId(id) };
  if (userId) filter.userId = userId;
  const existing = await Order.findOne(filter).lean();
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy đơn hàng');

  const existingPayment = await getPaymentForOrder(existing._id);
  if (existingPayment) {
    if (
      !['pending', 'confirmed'].includes(existing.status) ||
      existing.paymentStatus === 'paid' ||
      !['PENDING_PAYMENT', 'PARTIALLY_PAID'].includes(existingPayment.status)
    ) {
      throw new AppError(409, 'CANNOT_CANCEL', 'Không thể hủy đơn hàng ở trạng thái này');
    }

    const targetState = existingPayment.status === 'PARTIALLY_PAID' ? 'NEED_REFUND' : 'CANCELLED';
    const reason =
      targetState === 'NEED_REFUND'
        ? userId
          ? 'CUSTOMER_CANCELLED_PARTIAL'
          : 'ADMIN_CANCELLED_PARTIAL'
        : userId
          ? 'CUSTOMER_CANCELLED'
          : 'ADMIN_CANCELLED';
    const resolvedActor = actor || (userId ? `user:${String(userId)}` : 'admin');

    const { order, payment } = await transitionPaymentState({
      paymentId: existingPayment._id,
      targetState,
      reason,
      actor: resolvedActor,
    });
    emitOrderPaymentUpdate(order._id, buildOrderPaymentEventPayload(order, payment));
    return order;
  }

  const session = await mongoose.startSession();
  try {
    let cancelled;
    await session.withTransaction(async () => {
      // Conditional on the previous status: only one concurrent cancel wins, so refunds happen once.
      cancelled = await Order.findOneAndUpdate(
        { ...filter, status: { $in: ['pending', 'confirmed'] }, paymentStatus: { $ne: 'paid' } },
        { status: 'cancelled' },
        { returnDocument: 'after', session },
      );
      if (!cancelled) {
        throw new AppError(409, 'CANNOT_CANCEL', 'Không thể hủy đơn hàng ở trạng thái này');
      }
      const sortedItems = [...cancelled.items].sort((a, b) => String(a.productId).localeCompare(String(b.productId)));
      for (const item of sortedItems) {
        await Product.updateOne({ _id: item.productId }, { $inc: { stock: item.quantity } }, { session });
      }
      if (cancelled.promotionCode) await promotionService.release(cancelled.promotionCode, session);
    });
    return cancelled;
  } finally {
    await session.endSession();
  }
}

export async function updateStatus(id, next, { actor = 'admin' } = {}) {
  const updated = await transitionOrderStatus(id, next, { actor });
  if (updated.paymentMethod === 'bank') {
    const payment = await getPaymentForOrder(updated._id);
    emitOrderPaymentUpdate(updated._id, buildOrderPaymentEventPayload(updated, payment));
  }
  return updated;
}

export async function confirmPayment(id, { actor = 'admin' } = {}) {
  const order = await Order.findById(toObjectId(id)).lean();
  if (!order || order.status === 'cancelled') {
    throw new AppError(409, 'CANNOT_CONFIRM_PAYMENT', 'Không thể xác nhận thanh toán cho đơn này');
  }

  const payment = await getPaymentForOrder(order._id);
  if (payment) {
    if (!['PENDING_PAYMENT', 'PARTIALLY_PAID'].includes(payment.status)) {
      throw new AppError(409, 'CANNOT_CONFIRM_PAYMENT', 'Không thể xác nhận thanh toán cho đơn này');
    }
    const { order: updatedOrder, payment: updatedPayment } = await transitionPaymentState({
      paymentId: payment._id,
      targetState: 'PAID',
      reason: 'ADMIN_MANUAL_CONFIRM',
      actor,
      autoConfirmOrder: false,
    });
    emitOrderPaymentUpdate(updatedOrder._id, buildOrderPaymentEventPayload(updatedOrder, updatedPayment));
    return updatedOrder;
  }

  const updated = await Order.findOneAndUpdate(
    { _id: order._id, paymentStatus: { $in: ['unpaid', 'pending'] }, status: { $ne: 'cancelled' } },
    { paymentStatus: 'paid', paidAmount: order.total },
    { returnDocument: 'after' },
  );
  if (!updated) {
    throw new AppError(409, 'CANNOT_CONFIRM_PAYMENT', 'Không thể xác nhận thanh toán cho đơn này');
  }
  return updated;
}
