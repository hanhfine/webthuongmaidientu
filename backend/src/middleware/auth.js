import { AppError } from '../lib/errors.js';
import { verifyToken } from '../lib/auth.js';
import { User } from '../models/User.js';

export async function authenticate(req, res, next) {
  const token = req.cookies?.token;
  if (!token) throw new AppError(401, 'UNAUTHENTICATED', 'Cần đăng nhập');
  let payload;
  try {
    payload = await verifyToken(token);
  } catch {
    throw new AppError(401, 'UNAUTHENTICATED', 'Phiên đăng nhập không hợp lệ');
  }
  const user = await User.findById(payload.sub).select('role isActive');
  if (!user || !user.isActive) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Phiên đăng nhập không hợp lệ');
  }
  req.user = { id: String(user._id), role: user.role };
  next();
}

export const requireRole = (role) => (req, res, next) => {
  if (req.user?.role !== role) throw new AppError(403, 'FORBIDDEN', 'Không có quyền truy cập');
  next();
};

export const requireAdmin = [authenticate, requireRole('admin')];
