import { Review } from '../models/Review.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { AppError } from '../lib/errors.js';
import { toObjectId } from '../lib/ids.js';

export async function list(productId, { page, pageSize }) {
  const filter = { productId: toObjectId(productId) };
  const [rows, total] = await Promise.all([
    Review.find(filter).sort('-createdAt').skip((page - 1) * pageSize).limit(pageSize)
      .populate('userId', 'fullName').lean(),
    Review.countDocuments(filter),
  ]);
  const items = rows.map(({ userId, ...r }) => ({ ...r, user: { fullName: userId?.fullName ?? 'Người dùng' } }));
  return { items, total, page, pageSize };
}

async function recomputeRating(productId) {
  const [agg] = await Review.aggregate([
    { $match: { productId } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await Product.updateOne(
    { _id: productId },
    { ratingAvg: agg ? Math.round(agg.avg * 10) / 10 : 0, ratingCount: agg?.count ?? 0 },
  );
}

export async function upsert(userId, productId, { rating, comment }) {
  const pid = toObjectId(productId);
  if (!(await Product.exists({ _id: pid }))) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy sản phẩm');
  const purchased = await Order.exists({ userId, status: 'delivered', 'items.productId': pid });
  if (!purchased) {
    throw new AppError(403, 'NOT_PURCHASED', 'Bạn chỉ có thể đánh giá sản phẩm đã nhận hàng');
  }
  const existing = await Review.findOne({ userId, productId: pid });
  const review = await Review.findOneAndUpdate(
    { userId, productId: pid },
    { rating, comment },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );
  await recomputeRating(pid);
  return { review, created: !existing };
}
