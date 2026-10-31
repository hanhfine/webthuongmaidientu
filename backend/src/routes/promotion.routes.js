import { Router } from 'express';
import * as c from '../controllers/promotionController.js';
import { authenticate, requireAdmin, requireRole } from '../middleware/auth.js';

const router = Router();
router.post('/promotions/validate', authenticate, requireRole('customer'), c.validate);
router.get('/admin/promotions', requireAdmin, c.list);
router.post('/admin/promotions', requireAdmin, c.create);
router.put('/admin/promotions/:id', requireAdmin, c.update);
export default router;
