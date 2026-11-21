import * as service from '../services/orderService.js';
import { AppError } from '../lib/errors.js';
import { buildOrderPaymentEventPayload, subscribeOrderPaymentUpdates } from '../lib/paymentEvents.js';
import {
  confirmOrderPaymentSchema,
  createOrderSchema,
  orderPageSchema,
  updateOrderStatusSchema,
} from '../validators/order.js';

export async function create(req, res) {
  const rawBody = req.body && typeof req.body === 'object' ? req.body : {};
  const headerKey = req.get('idempotency-key');
  const input = createOrderSchema.parse({
    ...rawBody,
    requestKey: rawBody.requestKey ?? (headerKey ? headerKey.trim() : undefined),
  });
  const { order, payment, created } = await service.create(req.user.id, input);
  res.status(created ? 201 : 200).json(service.toResult(order, payment));
}

export const listMine = async (req, res) =>
  res.json(await service.listMine(req.user.id, orderPageSchema.parse(req.query)));

export async function show(req, res) {
  const order = await service.getMine(req.user.id, req.params.id);
  const payment = await service.getPaymentForOrder(order._id);
  res.json(service.toResult(order, payment));
}

export async function showAdmin(req, res) {
  const order = await service.getById(req.params.id);
  const payment = await service.getPaymentForOrder(order._id);
  res.json(service.toResult(order, payment));
}

export async function cancelMine(req, res) {
  const order = await service.cancel(req.params.id, { userId: req.user.id });
  const payment = await service.getPaymentForOrder(order._id);
  res.json(service.toResult(order, payment));
}

export const listAll = async (req, res) =>
  res.json(await service.listAll(orderPageSchema.parse(req.query)));

export async function updateStatus(req, res) {
  const { status } = updateOrderStatusSchema.parse(req.body);
  const order = await service.updateStatus(req.params.id, status, { actor: `admin:${req.user.id}` });
  const payment = await service.getPaymentForOrder(order._id);
  res.json(service.toResult(order, payment));
}

export async function confirmPayment(req, res) {
  confirmOrderPaymentSchema.parse(req.body);
  res.json(await service.confirmPayment(req.params.id, { actor: `admin:${req.user.id}` }));
}

export async function streamEvents(req, res) {
  const order = await service.getById(req.params.id);
  if (req.user.role !== 'admin' && String(order.userId) !== req.user.id) {
    throw new AppError(403, 'FORBIDDEN', 'Không có quyền truy cập');
  }
  const payment = await service.getPaymentForOrder(order._id);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  const sendEvent = (eventName, payload) => {
    if (res.writableEnded) return;
    res.write(`event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`);
  };

  sendEvent('payment_update', buildOrderPaymentEventPayload(order, payment));

  const unsubscribe = subscribeOrderPaymentUpdates(order._id, (payload) => {
    sendEvent('payment_update', payload);
  });

  const heartbeat = setInterval(() => {
    if (!res.writableEnded) {
      res.write(': ping\n\n');
    }
  }, 25_000);
  if (typeof heartbeat.unref === 'function') {
    heartbeat.unref();
  }

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
    if (!res.writableEnded) {
      res.end();
    }
  });
}
