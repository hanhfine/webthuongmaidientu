import { z } from 'zod';

export const addItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1),
});

export const quantitySchema = z.object({ quantity: z.number().int().min(1) });
