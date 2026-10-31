import * as service from '../services/cartService.js';
import { addItemSchema, quantitySchema } from '../validators/cart.js';

export const show = async (req, res) => res.json(await service.getView(req.user.id));
export const add = async (req, res) => {
  const { productId, quantity } = addItemSchema.parse(req.body);
  res.json(await service.addItem(req.user.id, productId, quantity));
};
export const setQuantity = async (req, res) => {
  const { quantity } = quantitySchema.parse(req.body);
  res.json(await service.setQuantity(req.user.id, req.params.productId, quantity));
};
export const remove = async (req, res) =>
  res.json(await service.removeItem(req.user.id, req.params.productId));
