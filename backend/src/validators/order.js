import { z } from 'zod';

export const orderStatusSchema = z.enum(['pending', 'confirmed', 'shipping', 'delivered', 'cancelled']);

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

export const orderPageSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  status: orderStatusSchema.optional(),
});

export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema,
});

export const confirmOrderPaymentSchema = z.object({
  paymentStatus: z.literal('paid'),
});
