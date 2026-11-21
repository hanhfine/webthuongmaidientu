import * as sepayService from '../services/sepayService.js';
import {
  exceptionsQuerySchema,
  reconcileUnmatchedSchema,
  refundOrderSchema,
  sepayWebhookSchema,
  unmatchedQuerySchema,
} from '../validators/payment.js';

export async function handleSepayWebhook(req, res) {
  sepayService.verifyWebhookAuth(req);
  const payload = sepayWebhookSchema.parse(req.body ?? {});
  const result = await sepayService.processIncomingTransaction(payload, { source: 'webhook' });
  res.status(200).json(result);
}

export async function listUnmatched(req, res) {
  const query = unmatchedQuerySchema.parse(req.query);
  res.json(await sepayService.listUnmatched(query));
}

export async function reconcileUnmatched(req, res) {
  const body = reconcileUnmatchedSchema.parse(req.body ?? {});
  res.json(await sepayService.reconcileUnmatched(req.params.id, body, req.user.id));
}

export async function listExceptions(req, res) {
  const query = exceptionsQuerySchema.parse(req.query);
  res.json(await sepayService.listExceptions(query));
}

export async function refundOrder(req, res) {
  const body = refundOrderSchema.parse(req.body ?? {});
  res.json(await sepayService.refundOrder(req.params.id, body, req.user.id));
}
