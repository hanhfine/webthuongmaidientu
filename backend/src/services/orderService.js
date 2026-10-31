import mongoose from 'mongoose';
import { Cart } from '../models/Cart.js';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { AppError } from '../lib/errors.js';
import { config } from '../config.js';
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
    await session.withTransaction(async () => {
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
    return { order, created: true };
  } catch (err) {
    if (err?.code === 11000) {
      const dup = await Order.findOne({ userId, requestKey });
      if (dup) return { order: dup, created: false };
    }
    throw err;
  } finally {
    await session.endSession();
  }
}
