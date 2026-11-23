import { z } from 'zod';
import { sanitizeText } from '../lib/sanitize.js';

export const reviewSchema = z.object({
  rating: z.number().int().min(1, 'Đánh giá tối thiểu 1 sao').max(5, 'Đánh giá tối đa 5 sao'),
  comment: z
    .string()
    .trim()
    .max(1000, 'Bình luận tối đa 1000 ký tự')
    .default('')
    .transform(sanitizeText),
});

export const pageSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});
