import { Router } from 'express';
import * as c from '../controllers/reviewController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.get('/products/:id/reviews', c.list);
router.post('/products/:id/reviews', authenticate, requireRole('customer'), c.create);
export default router;
