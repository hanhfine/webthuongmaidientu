import { Router } from 'express';
import * as c from '../controllers/cartController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use('/cart', authenticate);
router.get('/cart', c.show);
router.post('/cart/items', c.add);
router.patch('/cart/items/:productId', c.setQuantity);
router.delete('/cart/items/:productId', c.remove);
export default router;
