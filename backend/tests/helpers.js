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
