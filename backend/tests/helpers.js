import { Cart } from '../src/models/Cart.js';
import { Category } from '../src/models/Category.js';
import { Product } from '../src/models/Product.js';
import { Promotion } from '../src/models/Promotion.js';
import { slugify } from '../src/lib/slugify.js';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDb, disconnectDb } from '../src/lib/db.js';

export const app = createApp();

export async function setup() {
  await connectDb();
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
}

export async function resetDb() {
  const cols = await mongoose.connection.db.collections();
  await Promise.all(cols.map((c) => c.deleteMany({})));
}

export const teardown = disconnectDb;

import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { User } from '../src/models/User.js';
import * as orderService from '../src/services/orderService.js';

export async function createUser({
  role = 'customer',
  email = `u${Math.random().toString(36).slice(2)}@test.local`,
  password = 'password123',
  isActive = true,
  fullName = 'Test User',
} = {}) {
  const passwordHash = await bcrypt.hash(password, 4);
  const user = await User.create({ email, passwordHash, role, isActive, fullName });
  return { user, email, password };
}

export async function loginAs(opts) {
  const u = await createUser(opts);
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ email: u.email, password: u.password });
  assert.equal(res.status, 200);
  return { agent, user: u.user };
}

export const createPromotion = (overrides = {}) =>
  Promotion.create({
    code: 'SALE10',
    type: 'percent',
    value: 10,
    minOrder: 0,
    maxUses: 100,
    startsAt: new Date(Date.now() - 86_400_000),
    endsAt: new Date(Date.now() + 86_400_000),
    ...overrides,
  });

export const createCategory =(name = `Danh mục ${Math.random().toString(36).slice(2)}`) =>
  Category.create({ name, slug: slugify(name) });

export async function createProduct(overrides = {}) {
  const categoryId = overrides.categoryId ?? (await createCategory())._id;
  const name = overrides.name ?? `Sản phẩm ${Math.random().toString(36).slice(2)}`;
  return Product.create({
    name,
    slug: slugify(name),
    categoryId,
    brand: 'Apple',
    price: 10_000_000,
    stock: 10,
    ...overrides,
  });
}

export async function addToCart(userId, lines) {
  await Cart.deleteOne({ userId });
  await Cart.create({
    userId,
    items: lines.map(([p, q]) => ({ productId: p._id, quantity: q })),
  });
}

export const orderBody = (overrides = {}) => ({
  requestKey: `key-${Math.random().toString(36).slice(2)}`,
  paymentMethod: 'cod',
  shippingAddress: { fullName: 'Nguyễn An', phone: '0900000000', address: '1 Phố Huế, Hà Nội' },
  ...overrides,
});

export async function placeOrder(user, lines, overrides = {}) {
  await addToCart(user._id, lines);
  const { order } = await orderService.create(user._id, orderBody(overrides));
  return order;
}
