import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-f]{24}$/i, 'ID không hợp lệ');

export const productSchema = z.object({
  name: z.string().trim().min(1, 'Tên sản phẩm bắt buộc'),
  categoryId: objectId,
  brand: z.string().trim().min(1, 'Hãng bắt buộc'),
  price: z.number().int().min(0),
  stock: z.number().int().min(0),
  description: z.string().default(''),
  specs: z.record(z.string()).default({}),
  imageId: objectId.nullable().optional(),
  image: z.string().trim().url('URL ảnh không hợp lệ').nullable().optional(),
  images: z.array(z.string().trim().url('URL ảnh không hợp lệ')).optional(),
  isActive: z.boolean().optional(),
});

export const productPatchSchema = productSchema.partial();

const optionalPrice = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : v),
  z.coerce.number().min(0).optional(),
);

export const searchSchema = z.object({
  q: z.string().trim().optional(),
  category: z.string().optional(),
  brand: z.string().trim().optional(),
  minPrice: optionalPrice,
  maxPrice: optionalPrice,
  sort: z.preprocess((val) => {
    if (val === '-ratingAvg' || val === '-rating' || val === 'ratingAvg') return 'rating';
    if (val === '-price') return 'price_desc';
    if (val === 'price' || val === '+price') return 'price_asc';
    if (val === '-createdAt' || val === 'new') return 'newest';
    return val;
  }, z.enum(['newest', 'price_asc', 'price_desc', 'rating']).default('newest')),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});
