import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { AppError } from '../lib/errors.js';
import { signToken } from '../lib/auth.js';

export const toDTO = (u) => ({
  id: String(u._id),
  email: u.email,
  fullName: u.fullName,
  phone: u.phone,
  role: u.role,
  isActive: u.isActive,
});

export async function register({ email, password, fullName, phone }) {
  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const user = await User.create({ email, passwordHash, fullName, phone, role: 'customer' });
    return toDTO(user);
  } catch (err) {
    if (err.code === 11000) throw new AppError(409, 'EMAIL_TAKEN', 'Email đã được đăng ký');
    throw err;
  }
}

export async function login({ email, password }) {
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng');
  }
  if (!user.isActive) throw new AppError(403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa');
  return { user: toDTO(user), token: await signToken(user) };
}

export async function getById(id) {
  const user = await User.findById(id);
  if (!user) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy người dùng');
  return toDTO(user);
}
