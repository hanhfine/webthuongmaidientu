import { z } from 'zod';
import { sanitizeText } from '../lib/sanitize.js';

// Vietnamese letters + numbers + spaces + dot + hyphen
const SAFE_NAME_REGEX = /^[a-zA-Z0-9\sÀ-ỹ\.\-]+$/;
const SQLI_OR_XSS_DETECT = /['";<>\\]|--|\/\*|\*\//;

// Vietnamese phone: 10 digits starting with 0 or +84/84
const VN_PHONE_REGEX = /^(?:0|\+?84)[0-9]{9}$/;

// Safe address characters: letters, numbers, spaces, commas, periods, slashes, hyphens, hashes
const SAFE_ADDRESS_REGEX = /^[a-zA-Z0-9\sÀ-ỹ,.\/\-#\(\)]+$/;

export const orderStatusSchema = z.enum(['pending', 'confirmed', 'shipping', 'delivered', 'cancelled']);

export const createOrderSchema = z.object({
  requestKey: z
    .string()
    .trim()
    .min(8, 'Request key tối thiểu 8 ký tự')
    .max(100, 'Request key tối đa 100 ký tự')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Request key chỉ chứa ký tự chữ, số và gạch ngang'),

  paymentMethod: z.enum(['cod', 'bank'], {
    errorMap: () => ({ message: 'Phương thức thanh toán phải là COD hoặc chuyển khoản ngân hàng' }),
  }),

  shippingAddress: z.object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Họ tên tối thiểu 2 ký tự')
      .max(100, 'Họ tên tối đa 100 ký tự')
      .refine((val) => !SQLI_OR_XSS_DETECT.test(val) && SAFE_NAME_REGEX.test(val), {
        message: 'Họ và tên không hợp lệ hoặc chứa ký tự đặc biệt bị cấm',
      }),

    phone: z
      .string()
      .trim()
      .regex(VN_PHONE_REGEX, 'Số điện thoại không đúng định dạng (10 chữ số)'),

    address: z
      .string()
      .trim()
      .min(5, 'Địa chỉ tối thiểu 5 ký tự')
      .max(250, 'Địa chỉ tối đa 250 ký tự')
      .refine((val) => !SQLI_OR_XSS_DETECT.test(val) && SAFE_ADDRESS_REGEX.test(val), {
        message: 'Địa chỉ chứa ký tự không hợp lệ hoặc chứa mã độc',
      })
      .transform(sanitizeText),
  }),

  promotionCode: z
    .string()
    .trim()
    .regex(/^[A-Z0-9_-]{3,20}$/i, 'Mã giảm giá chỉ gồm 3-20 ký tự chữ và số')
    .optional(),
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
