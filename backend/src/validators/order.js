import { z } from 'zod';

export const createOrderSchema = z.object({
  requestKey: z.string().min(8).max(100),
  paymentMethod: z.enum(['cod', 'bank']),
  shippingAddress: z.object({
    fullName: z.string().trim().min(1, 'Họ tên bắt buộc'),
    phone: z.string().trim().min(8, 'Số điện thoại không hợp lệ'),
    address: z.string().trim().min(5, 'Địa chỉ bắt buộc'),
  }),
  promotionCode: z.string().trim().min(1).optional(),
});
