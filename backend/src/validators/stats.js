import { z } from 'zod';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export const revenueQuerySchema = z
  .object({ from: z.string().optional(), to: z.string().optional() })
  .transform(({ from, to }) => {
    const end = to ? new Date(to) : new Date();
    if (to && DATE_ONLY.test(to)) end.setUTCHours(23, 59, 59, 999);
    const start = from ? new Date(from) : new Date(end.getTime() - 30 * 86_400_000);
    return { from: start, to: end };
  })
  .refine(({ from, to }) => !Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()), {
    message: 'Ngày không hợp lệ',
  });
