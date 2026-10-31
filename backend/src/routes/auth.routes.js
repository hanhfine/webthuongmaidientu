import { Router } from 'express';
import * as c from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.post('/auth/register', c.register);
router.post('/auth/login', c.login);
router.post('/auth/logout', c.logout);
router.get('/auth/me', authenticate, c.me);
export default router;
