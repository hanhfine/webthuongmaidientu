import * as service from '../services/orderService.js';
import { createOrderSchema } from '../validators/order.js';

export async function create(req, res) {
  const { order, created } = await service.create(req.user.id, createOrderSchema.parse(req.body));
  res.status(created ? 201 : 200).json(service.toResult(order));
}
