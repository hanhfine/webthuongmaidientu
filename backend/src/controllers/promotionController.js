import * as service from '../services/promotionService.js';
import * as cartService from '../services/cartService.js';
import { promotionSchema, promotionPatchSchema, validateSchema } from '../validators/promotion.js';

export async function validate(req, res) {
  const { code } = validateSchema.parse(req.body);
  const { subtotal } = await cartService.getView(req.user.id);
  const result = await service.validate(code, subtotal);
  res.json({ ...result, subtotal });
}

export const list = async (req, res) => res.json(await service.list());
export const create = async (req, res) =>
  res.status(201).json(await service.create(promotionSchema.parse(req.body)));
export const update = async (req, res) =>
  res.json(await service.update(req.params.id, promotionPatchSchema.parse(req.body)));
