import { Router } from 'express';
import authRoutes from './auth.routes.js';
import cartRoutes from './cart.routes.js';
import categoryRoutes from './category.routes.js';
import imageRoutes from './image.routes.js';
import productRoutes from './product.routes.js';
import promotionRoutes from './promotion.routes.js';

const router = Router();

router.get('/health', (req, res) => res.json({ ok: true }));
router.use(authRoutes);
router.use(categoryRoutes);
router.use(imageRoutes);
router.use(productRoutes);
router.use(cartRoutes);
router.use(promotionRoutes);

export default router;
