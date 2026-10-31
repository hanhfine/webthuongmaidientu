import { Router } from 'express';
import * as c from '../controllers/orderController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.post('/orders', authenticate, requireRole('customer'), c.create);
export default router;
