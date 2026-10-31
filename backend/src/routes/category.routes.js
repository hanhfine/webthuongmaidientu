import { Router } from 'express';
import * as c from '../controllers/categoryController.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
router.get('/categories', c.list);
router.get('/admin/categories', requireAdmin, c.listAll);
router.post('/categories', requireAdmin, c.create);
router.put('/categories/:id', requireAdmin, c.update);
router.delete('/categories/:id', requireAdmin, c.remove);
export default router;
