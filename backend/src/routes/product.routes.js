import { Router } from 'express';
import * as c from '../controllers/productController.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
router.get('/products', c.list);
router.get('/products/:id', c.show);
router.get('/brands', c.brands);
router.get('/admin/products', requireAdmin, c.listAdmin);
router.post('/products', requireAdmin, c.create);
router.put('/products/:id', requireAdmin, c.update);
router.delete('/products/:id', requireAdmin, c.remove);
export default router;
