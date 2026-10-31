import { Router } from 'express';
import authRoutes from './auth.routes.js';
import cartRoutes from './cart.routes.js';
import categoryRoutes from './category.routes.js';
import imageRoutes from './image.routes.js';
import orderRoutes from './order.routes.js';
import productRoutes from './product.routes.js';
import promotionRoutes from './promotion.routes.js';
import reviewRoutes from './review.routes.js';
import userRoutes from './user.routes.js';
import statsRoutes from './stats.routes.js';

const router = Router();

router.get('/health', (req, res) => res.json({ ok: true }));
router.use(authRoutes);
router.use(categoryRoutes);
router.use(imageRoutes);
router.use(productRoutes);
router.use(cartRoutes);
router.use(promotionRoutes);
router.use(orderRoutes);
router.use(reviewRoutes);
router.use(userRoutes);
router.use(statsRoutes);

export default router;
