import { Router } from 'express';
import * as c from '../controllers/orderController.js';
import { authenticate, requireRole, requireAdmin } from '../middleware/auth.js';

const router = Router();
const customer = [authenticate, requireRole('customer')];
router.post('/orders', ...customer, c.create);
router.get('/orders', ...customer, c.listMine);
router.get('/orders/:id', ...customer, c.show);
router.post('/orders/:id/cancel', ...customer, c.cancelMine);
router.get('/admin/orders', requireAdmin, c.listAll);
router.patch('/admin/orders/:id/status', requireAdmin, c.updateStatus);
router.patch('/admin/orders/:id/payment', requireAdmin, c.confirmPayment);
export default router;
