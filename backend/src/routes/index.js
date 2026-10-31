import { Router } from 'express';
import authRoutes from './auth.routes.js';
import categoryRoutes from './category.routes.js';
import imageRoutes from './image.routes.js';

const router = Router();

router.get('/health', (req, res) => res.json({ ok: true }));
router.use(authRoutes);
router.use(categoryRoutes);
router.use(imageRoutes);

export default router;
