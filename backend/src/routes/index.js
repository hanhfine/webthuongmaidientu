import { Router } from 'express';
import authRoutes from './auth.routes.js';

const router = Router();

router.get('/health', (req, res) => res.json({ ok: true }));
router.use(authRoutes);

export default router;
