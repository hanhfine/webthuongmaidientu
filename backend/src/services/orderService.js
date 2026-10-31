import mongoose from 'mongoose';
import { Cart } from '../models/Cart.js';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { AppError } from '../lib/errors.js';
import { config } from '../config.js';
import { toObjectId } from '../lib/ids.js';
import * as promotionService from './promotionService.js';

export function toResult(order) {
  const obj = order.toObject ? order.toObject() : order;
  const paymentInfo = { method: obj.paymentMethod };
  if (obj.paymentMethod === 'bank') {
    paymentInfo.bank = config.bank;
    paymentInfo.transferContent = `DH${String(obj._id).slice(-8).toUpperCase()}`;
  }
  return { ...obj, paymentInfo };
}

export async function create(userId, input) {
  const { requestKey, paymentMethod, shippingAddress, promotionCode } = input;

  const existing = await Order.findOne({ userId, requestKey });
  if (existing) return { order: existing, created: false };

  const session = await mongoose.startSession();
  try {
    let order;
    let replayed = false;
    await session.withTransaction(async () => {
      // A retried transaction (write conflict) may find the order a concurrent identical request created.
      replayed = false;
      const prior = await Order.findOne({ userId, requestKey }).session(session);
      if (prior) {
        order = prior;
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
        const product = await Product.findOneAndUpdate(
          { _id: item.productId, isActive: true, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { returnDocument: 'after', session },
        );
        if (!product) {
          const current = await Product.findById(item.productId).session(session);
          throw new AppError(409, 'OUT_OF_STOCK', `Sản phẩm "${current?.name ?? item.productId}" không đủ hàng`);
        }
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

      [order] = await Order.create(
        [
          {
            userId,
            requestKey,
            items: lines,
            shippingAddress,
            subtotal,
            discount,
            shippingFee,
            total: subtotal - discount + shippingFee,
            promotionCode: appliedCode,
            paymentMethod,
            paymentStatus: paymentMethod === 'cod' ? 'unpaid' : 'pending',
          },
        ],
        { session },
      );
      await Cart.updateOne({ userId }, { $set: { items: [] } }, { session });
    });
    return { order, created: !replayed };
  } catch (err) {
    const dup = await Order.findOne({ userId, requestKey });
    if (dup) return { order: dup, created: false };
    throw err;
  } finally {
    await session.endSession();
  }
}

const TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipping', 'cancelled'],
  shipping: ['delivered'],
  delivered: [],
  cancelled: [],
};

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

export async function cancel(id, { userId } = {}) {
  const filter = { _id: toObjectId(id) };
  if (userId) filter.userId = userId;
  if (!(await Order.exists(filter))) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy đơn hàng');

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
      for (const item of cancelled.items) {
        await Product.updateOne({ _id: item.productId }, { $inc: { stock: item.quantity } }, { session });
      }
      if (cancelled.promotionCode) await promotionService.release(cancelled.promotionCode, session);
    });
    return cancelled;
  } finally {
    await session.endSession();
  }
}

export async function updateStatus(id, next) {
  const order = await Order.findById(toObjectId(id));
  if (!order) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy đơn hàng');
  if (!TRANSITIONS[order.status].includes(next)) {
    throw new AppError(409, 'INVALID_TRANSITION', `Không thể chuyển từ ${order.status} sang ${next}`);
  }
  if (next === 'cancelled') return cancel(id);
  if (next === 'confirmed' && order.paymentMethod === 'bank' && order.paymentStatus !== 'paid') {
    throw new AppError(409, 'PAYMENT_REQUIRED', 'Đơn chuyển khoản cần xác nhận đã thanh toán trước');
  }
  const patch = { status: next };
  if (next === 'delivered') patch.deliveredAt = new Date();
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, status: order.status },
    patch,
    { returnDocument: 'after' },
  );
  if (!updated) throw new AppError(409, 'CONFLICT', 'Đơn hàng vừa được cập nhật, vui lòng tải lại');
  return updated;
}

export async function confirmPayment(id) {
  const updated = await Order.findOneAndUpdate(
    { _id: toObjectId(id), paymentStatus: { $in: ['unpaid', 'pending'] }, status: { $ne: 'cancelled' } },
    { paymentStatus: 'paid' },
    { returnDocument: 'after' },
  );
  if (!updated) {
    throw new AppError(409, 'CANNOT_CONFIRM_PAYMENT', 'Không thể xác nhận thanh toán cho đơn này');
  }
  return updated;
}
