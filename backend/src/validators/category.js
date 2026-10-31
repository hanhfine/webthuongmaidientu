import { z } from 'zod';

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Tên danh mục bắt buộc'),
  isActive: z.boolean().optional(),
});
