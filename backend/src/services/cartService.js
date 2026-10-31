import { Cart } from '../models/Cart.js';
import { Product } from '../models/Product.js';
import { AppError } from '../lib/errors.js';
import { toObjectId } from '../lib/ids.js';

const getOrCreate = (userId) =>
  Cart.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId, items: [] } },
    { upsert: true, returnDocument: 'after' },
  );

export async function getView(userId) {
  const cart = await getOrCreate(userId);
  const products = await Product.find({ _id: { $in: cart.items.map((i) => i.productId) } }).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const items = cart.items.map((i) => {
    const p = byId.get(String(i.productId));
    const available = Boolean(p && p.isActive && p.stock >= i.quantity);
    return {
      productId: String(i.productId),
      name: p?.name ?? '(sản phẩm đã bị xóa)',
      price: p?.price ?? 0,
      imageId: p?.imageId ? String(p.imageId) : null,
      stock: p?.stock ?? 0,
      quantity: i.quantity,
      available,
      lineTotal: available ? p.price * i.quantity : 0,
    };
  });
  return { items, subtotal: items.reduce((sum, i) => sum + i.lineTotal, 0) };
}

async function loadActiveProduct(productId) {
  const product = await Product.findById(toObjectId(productId));
  if (!product || !product.isActive) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy sản phẩm');
  return product;
}

function assertStock(product, quantity) {
  if (quantity > product.stock) {
    throw new AppError(409, 'OUT_OF_STOCK', `Chỉ còn ${product.stock} sản phẩm "${product.name}"`);
  }
}

export async function addItem(userId, productId, quantity) {
  const product = await loadActiveProduct(productId);
  const cart = await getOrCreate(userId);
  const line = cart.items.find((i) => String(i.productId) === productId);
  const next = (line?.quantity ?? 0) + quantity;
  assertStock(product, next);
  if (line) line.quantity = next;
  else cart.items.push({ productId: product._id, quantity });
  await cart.save();
  return getView(userId);
}

export async function setQuantity(userId, productId, quantity) {
  const product = await loadActiveProduct(productId);
  assertStock(product, quantity);
  const cart = await getOrCreate(userId);
  const line = cart.items.find((i) => String(i.productId) === productId);
  if (!line) throw new AppError(404, 'NOT_FOUND', 'Sản phẩm không có trong giỏ');
  line.quantity = quantity;
  await cart.save();
  return getView(userId);
}

export async function removeItem(userId, productId) {
  await Cart.updateOne({ userId }, { $pull: { items: { productId: toObjectId(productId) } } });
  return getView(userId);
}
