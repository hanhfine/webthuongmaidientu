import { Image } from '../models/Image.js';
import { AppError } from '../lib/errors.js';
import { toObjectId } from '../lib/ids.js';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

function hasValidMagicBytes(mimetype, buf) {
  if (!buf || buf.length < 4) return false;
  if (mimetype === 'image/png') {
    return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  }
  if (mimetype === 'image/jpeg') {
    return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  }
  if (mimetype === 'image/webp') {
    return (
      buf.length >= 12 &&
      buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buf.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  return false;
}

export async function create(file) {
  if (!file || !file.buffer?.length) throw new AppError(400, 'INVALID_FILE', 'Thiếu file ảnh');
  if (!ALLOWED.includes(file.mimetype) || !hasValidMagicBytes(file.mimetype, file.buffer)) {
    throw new AppError(400, 'INVALID_FILE', 'Chỉ nhận ảnh JPEG, PNG hoặc WebP hợp lệ');
  }
  const img = await Image.create({ data: file.buffer, contentType: file.mimetype, size: file.size });
  return { id: String(img._id) };
}

export async function get(id) {
  const img = await Image.findById(toObjectId(id));
  if (!img) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy ảnh');
  return img;
}
