import { Image } from '../models/Image.js';
import { AppError } from '../lib/errors.js';
import { toObjectId } from '../lib/ids.js';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

export async function create(file) {
  if (!file) throw new AppError(400, 'INVALID_FILE', 'Thiếu file ảnh');
  if (!ALLOWED.includes(file.mimetype)) {
    throw new AppError(400, 'INVALID_FILE', 'Chỉ nhận ảnh JPEG, PNG hoặc WebP');
  }
  const img = await Image.create({ data: file.buffer, contentType: file.mimetype, size: file.size });
  return { id: String(img._id) };
}

export async function get(id) {
  const img = await Image.findById(toObjectId(id));
  if (!img) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy ảnh');
  return img;
}
