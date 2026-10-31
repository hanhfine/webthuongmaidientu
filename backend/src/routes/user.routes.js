import { Router } from 'express';
import * as c from '../controllers/userController.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
router.get('/admin/users', requireAdmin, c.list);
router.patch('/admin/users/:id/status', requireAdmin, c.setStatus);
export default router;
