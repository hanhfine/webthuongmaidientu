import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';

export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    const body = { code: err.code, message: err.message };
    if (err.fieldErrors) body.fieldErrors = err.fieldErrors;
    return res.status(err.status).json(body);
  }
  if (err instanceof ZodError) {
    return res.status(400).json({
      code: 'VALIDATION',
      message: 'Dữ liệu không hợp lệ',
      fieldErrors: err.flatten().fieldErrors,
    });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ code: 'BAD_JSON', message: 'JSON không hợp lệ' });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ code: 'FILE_TOO_LARGE', message: 'Ảnh tối đa 2 MB' });
  }
  console.error(err);
  res.status(500).json({ code: 'INTERNAL', message: 'Lỗi máy chủ' });
}
