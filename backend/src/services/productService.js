import crypto from 'node:crypto';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { Image } from '../models/Image.js';
import { AppError } from '../lib/errors.js';
import { slugify } from '../lib/slugify.js';
import { toObjectId } from '../lib/ids.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const SORTS = {
  newest: { createdAt: -1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  rating: { ratingAvg: -1, ratingCount: -1 },
};

export async function search(query, { includeInactive = false } = {}) {
  const { q, category, brand, minPrice, maxPrice, sort, page, pageSize } = query;
  const filter = {};
  if (!includeInactive) filter.isActive = true;
  if (q) {
    const re = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: re }, { brand: re }];
  }
  if (category) filter.categoryId = toObjectId(category);
  if (brand) filter.brand = new RegExp(`^${escapeRegex(brand)}$`, 'i');
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = minPrice;
    if (maxPrice !== undefined) filter.price.$lte = maxPrice;
  }
  const [items, total] = await Promise.all([
    Product.find(filter).sort(SORTS[sort]).skip((page - 1) * pageSize).limit(pageSize).lean(),
    Product.countDocuments(filter),
  ]);
  return { items, total, page, pageSize };
}

export async function getById(id, { includeInactive = false } = {}) {
  const product = await Product.findById(toObjectId(id)).lean();
  if (!product || (!includeInactive && !product.isActive)) {
    throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy sản phẩm');
  }
  return product;
}

export async function listBrands() {
  const brands = await Product.distinct('brand', { isActive: true });
  return brands.sort((a, b) => a.localeCompare(b));
}

async function assertCategory(categoryId) {
  const valid = /^[0-9a-f]{24}$/i.test(categoryId);
  if (!valid || !(await Category.exists({ _id: categoryId }))) {
    throw new AppError(400, 'CATEGORY_NOT_FOUND', 'Danh mục không tồn tại');
  }
}

async function assertImage(imageId) {
  if (imageId && !(await Image.exists({ _id: imageId }))) {
    throw new AppError(400, 'IMAGE_NOT_FOUND', 'Ảnh không tồn tại');
  }
}

export async function create(data) {
  await assertCategory(data.categoryId);
  await assertImage(data.imageId);
  const slug = `${slugify(data.name)}-${crypto.randomBytes(3).toString('hex')}`;
  return Product.create({ ...data, slug });
}

export async function update(id, data) {
  if (data.categoryId) await assertCategory(data.categoryId);
  await assertImage(data.imageId);
  const patch = { ...data };
  if (data.name) patch.slug = `${slugify(data.name)}-${crypto.randomBytes(3).toString('hex')}`;
  const product = await Product.findByIdAndUpdate(toObjectId(id), patch, { returnDocument: 'after' });
  if (!product) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy sản phẩm');
  return product;
}

export async function archive(id) {
  await update(id, { isActive: false });
}
