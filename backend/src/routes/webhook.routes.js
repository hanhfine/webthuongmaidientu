// Route công khai tiếp nhận Webhook thanh toán VietQR
import { Router } from 'express';
import * as c from '../controllers/webhookController.js';

const router = Router();

// Endpoint tiếp nhận webhook từ SePay / PayOS / VietQR
router.post('/webhooks/vietqr', c.handleVietQrWebhook);

export default router;
