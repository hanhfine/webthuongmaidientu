// Controller tiếp nhận và xử lý request Webhook từ cổng thanh toán VietQR
import * as paymentService from '../services/paymentService.js';
import { vietQrWebhookSchema } from '../validators/webhook.js';

// Handler xử lý webhook POST /api/webhooks/vietqr
export async function handleVietQrWebhook(req, res, next) {
  try {
    // 1. Kiểm tra và làm sạch dữ liệu đầu vào bằng Zod schema
    const cleanPayload = vietQrWebhookSchema.parse(req.body);

    // 2. Lấy secret token từ Header 'x-api-key'
    let headerSecret = req.headers['x-api-key'];
    if (!headerSecret && req.headers['authorization']) {
      headerSecret = req.headers['authorization'].replace(/^(Apikey|Bearer)\s+/i, '').trim();
    }

    // 3. Gọi service xử lý nghiệp vụ thanh toán
    const result = await paymentService.processVietQrWebhook(cleanPayload, headerSecret);

    // 4. Trả kết quả thành công về cho máy chủ gửi Webhook
    return res.status(200).json(result);
  } catch (err) {
    // Chuyển lỗi sang middleware errorHandler xử lý tập trung
    next(err);
  }
}
