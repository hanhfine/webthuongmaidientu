import { z } from 'zod';

export const userListSchema = z.object({
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export const userStatusSchema = z.object({ isActive: z.boolean() });
