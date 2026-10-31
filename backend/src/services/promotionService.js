import { Promotion } from '../models/Promotion.js';
import { AppError, conflictIfDuplicate } from '../lib/errors.js';
import { toObjectId } from '../lib/ids.js';
import { promotionSchema } from '../validators/promotion.js';

const invalid = () => new AppError(400, 'PROMO_INVALID', 'Mã giảm giá không hợp lệ hoặc đã hết hạn/lượt dùng');

const usableFilter = (code, subtotal) => {
  const now = new Date();
  return {
    code: code.trim().toUpperCase(),
    isActive: true,
    startsAt: { $lte: now },
    endsAt: { $gte: now },
    minOrder: { $lte: subtotal },
    $expr: { $lt: ['$usedCount', '$maxUses'] },
  };
};

export function computeDiscount(promo, subtotal) {
  const raw = promo.type === 'percent' ? Math.floor((subtotal * promo.value) / 100) : promo.value;
  return Math.min(raw, subtotal);
}

export async function validate(code, subtotal) {
  const promo = await Promotion.findOne(usableFilter(code, subtotal));
  if (!promo) throw invalid();
  return { code: promo.code, discount: computeDiscount(promo, subtotal) };
}

export async function consume(code, subtotal, session) {
  const promo = await Promotion.findOneAndUpdate(
    usableFilter(code, subtotal),
    { $inc: { usedCount: 1 } },
    { returnDocument: 'after', session },
  );
  if (!promo) throw invalid();
  return promo;
}

export async function release(code, session) {
  await Promotion.updateOne({ code, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } }, { session });
}

export const list = () => Promotion.find().sort('-createdAt').lean();

export async function create(data) {
  try {
    return await Promotion.create(data);
  } catch (err) {
    throw conflictIfDuplicate(err, 'Mã giảm giá đã tồn tại');
  }
}

export async function update(id, data) {
  const _id = toObjectId(id);
  const existing = await Promotion.findById(_id).lean();
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy mã giảm giá');
  const merged = promotionSchema.safeParse({ ...existing, ...data });
  if (!merged.success) {
    throw new AppError(400, 'VALIDATION', 'Dữ liệu không hợp lệ', merged.error.flatten().fieldErrors);
  }
  const promo = await Promotion.findByIdAndUpdate(_id, data, { returnDocument: 'after' });
  if (!promo) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy mã giảm giá');
  return promo;
}
