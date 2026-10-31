import { Router } from 'express';
import * as c from '../controllers/imageController.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
router.post('/images', requireAdmin, c.uploadMiddleware, c.upload);
router.get('/images/:id', c.show);
export default router;
