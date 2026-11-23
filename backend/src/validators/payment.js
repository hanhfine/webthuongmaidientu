import { z } from 'zod';

const objectIdSchema = z.string().trim().regex(/^[0-9a-f]{24}$/i, 'Mã đối tượng không hợp lệ');

export const sepayWebhookSchema = z
  .object({
    id: z.union([
      z.number().int().refine(Number.isSafeInteger, 'Mã giao dịch không hợp lệ'),
      z.string().trim().min(1, 'Mã giao dịch bắt buộc'),
    ]),
    gateway: z
      .string()
      .trim()
      .nullish()
      .transform((v) => v ?? ''),
    transactionDate: z.string().trim().nullish(),
    accountNumber: z
      .string()
      .trim()
      .nullish()
      .transform((v) => v ?? ''),
    subAccount: z.string().trim().nullish(),
    code: z.string().trim().nullish(),
    content: z
      .string()
      .nullish()
      .transform((v) => v ?? ''),
    transferType: z.enum(['in', 'out']),
    description: z.string().nullish(),
    transferAmount: z
      .number()
      .int('Số tiền phải là số nguyên VNĐ')
      .min(0, 'Số tiền không được âm')
      .refine(Number.isSafeInteger, 'Số tiền không hợp lệ'),
    referenceCode: z
      .string()
      .trim()
      .nullish()
      .transform((v) => v ?? ''),
    accumulated: z.number().nullish(),
  })
  .passthrough();

export const unmatchedQuerySchema = z.object({
  status: z.enum(['OPEN', 'RESOLVED_MATCHED', 'RESOLVED_REFUNDED', 'IGNORED', 'ALL']).default('OPEN'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const exceptionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const reconcileUnmatchedSchema = z
  .object({
    action: z.enum(['match_order', 'mark_refunded', 'ignore']),
    orderId: objectIdSchema.optional(),
    note: z.string().trim().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.action === 'match_order' && !data.orderId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['orderId'],
        message: 'Cần chọn đơn hàng khi khớp giao dịch thủ công',
      });
    }
  });

export const refundOrderSchema = z.object({
  note: z.string().trim().max(500).optional(),
});
