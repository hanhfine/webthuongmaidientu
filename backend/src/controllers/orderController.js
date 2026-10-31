import { z } from 'zod';
import * as service from '../services/orderService.js';
import { createOrderSchema } from '../validators/order.js';

export async function create(req, res) {
  const { order, created } = await service.create(req.user.id, createOrderSchema.parse(req.body));
  res.status(created ? 201 : 200).json(service.toResult(order));
}

const pageSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(['pending', 'confirmed', 'shipping', 'delivered', 'cancelled']).optional(),
});

export const listMine = async (req, res) =>
  res.json(await service.listMine(req.user.id, pageSchema.parse(req.query)));
export const show = async (req, res) =>
  res.json(service.toResult(await service.getMine(req.user.id, req.params.id)));
export const cancelMine = async (req, res) =>
  res.json(service.toResult(await service.cancel(req.params.id, { userId: req.user.id })));
export const listAll = async (req, res) =>
  res.json(await service.listAll(pageSchema.parse(req.query)));
export const updateStatus = async (req, res) => {
  const { status } = z.object({ status: pageSchema.shape.status.unwrap() }).parse(req.body);
  res.json(await service.updateStatus(req.params.id, status));
};
export const confirmPayment = async (req, res) => {
  z.object({ paymentStatus: z.literal('paid') }).parse(req.body);
  res.json(await service.confirmPayment(req.params.id));
};
