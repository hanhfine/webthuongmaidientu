import { z } from 'zod';

export const productSchema = z.object({
  name: z.string().trim().min(1, 'Tên sản phẩm bắt buộc'),
  categoryId: z.string().min(1),
  brand: z.string().trim().min(1, 'Hãng bắt buộc'),
  price: z.number().int().min(0),
  stock: z.number().int().min(0),
  description: z.string().default(''),
  specs: z.record(z.string()).default({}),
  imageId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const productPatchSchema = productSchema.partial();

export const searchSchema = z.object({
  q: z.string().trim().optional(),
  category: z.string().optional(),
  brand: z.string().trim().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'rating']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});
