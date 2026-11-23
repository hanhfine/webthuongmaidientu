import { Router } from 'express';
import * as c from '../controllers/paymentController.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

router.post('/webhooks/sepay', c.handleSepayWebhook);
router.post('/webhooks/payment', c.handleSepayWebhook);

router.get('/admin/payments/unmatched', requireAdmin, c.listUnmatched);
router.post('/admin/payments/unmatched/:id/reconcile', requireAdmin, c.reconcileUnmatched);
router.get('/admin/payments/exceptions', requireAdmin, c.listExceptions);
router.post('/admin/orders/:id/refund', requireAdmin, c.refundOrder);

export default router;
