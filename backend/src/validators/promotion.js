import { z } from 'zod';

export const promotionSchema = z
  .object({
    code: z.string().trim().min(3).max(30),
    type: z.enum(['percent', 'fixed']),
    value: z.number().int().min(1),
    minOrder: z.number().int().min(0).default(0),
    maxUses: z.number().int().min(1),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    isActive: z.boolean().optional(),
  })
  .refine((p) => p.type !== 'percent' || p.value <= 100, {
    message: 'Phần trăm tối đa 100',
    path: ['value'],
  })
  .refine((p) => p.endsAt > p.startsAt, { message: 'Ngày kết thúc phải sau ngày bắt đầu', path: ['endsAt'] });

export const promotionPatchSchema = z.object({
  value: z.number().int().min(1).optional(),
  minOrder: z.number().int().min(0).optional(),
  maxUses: z.number().int().min(1).optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
});

export const validateSchema = z.object({ code: z.string().trim().min(1) });
