import { Router } from 'express';
import * as c from '../controllers/statsController.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
router.get('/admin/stats/revenue', requireAdmin, c.revenue);
export default router;
