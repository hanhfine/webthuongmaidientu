import { User } from '../models/User.js';
import { AppError } from '../lib/errors.js';
import { toObjectId } from '../lib/ids.js';
import { toDTO } from './authService.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function list({ q, page, pageSize }) {
  const filter = {};
  if (q) {
    const re = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ email: re }, { fullName: re }];
  }
  const [users, total] = await Promise.all([
    User.find(filter).sort('-createdAt').skip((page - 1) * pageSize).limit(pageSize),
    User.countDocuments(filter),
  ]);
  return { items: users.map(toDTO), total, page, pageSize };
}

export async function setStatus(actingAdminId, id, isActive) {
  if (String(actingAdminId) === id) {
    throw new AppError(400, 'CANNOT_LOCK_SELF', 'Không thể khóa chính tài khoản của bạn');
  }
  const user = await User.findByIdAndUpdate(toObjectId(id), { isActive }, { returnDocument: 'after' });
  if (!user) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy người dùng');
  return toDTO(user);
}
