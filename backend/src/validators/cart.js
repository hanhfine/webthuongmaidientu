import { z } from 'zod';

const objectIdRegex = /^[0-9a-f]{24}$/i;

export const addItemSchema = z.object({
  productId: z.string().trim().regex(objectIdRegex, 'Mã sản phẩm không hợp lệ'),
  quantity: z
    .number({ invalid_type_error: 'Số lượng phải là số' })
    .int('Số lượng phải là số nguyên')
    .min(1, 'Số lượng tối thiểu là 1')
    .max(99, 'Số lượng tối đa mỗi mặt hàng là 99'),
});

export const quantitySchema = z.object({
  quantity: z
    .number({ invalid_type_error: 'Số lượng phải là số' })
    .int('Số lượng phải là số nguyên')
    .min(1, 'Số lượng tối thiểu là 1')
    .max(99, 'Số lượng tối đa mỗi mặt hàng là 99'),
});
