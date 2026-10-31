import mongoose from 'mongoose';
import { AppError } from './errors.js';

export function toObjectId(id) {
  if (typeof id !== 'string' || !/^[0-9a-f]{24}$/i.test(id)) {
    throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy');
  }
  return new mongoose.Types.ObjectId(id);
}
