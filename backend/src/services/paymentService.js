// Service xử lý nghiệp vụ thanh toán tự động qua Webhook VietQR
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { config } from '../config.js';
import { AppError } from '../lib/errors.js';
import { Order } from '../models/Order.js';
import { PaymentTransaction } from '../models/PaymentTransaction.js';
import { extractOrderIdFromContent } from '../validators/webhook.js';

// Hàm so khớp secret key an toàn bằng timingSafeEqual để chống Timing Attack (OWASP A07)
function verifyWebhookSecret(headerSecret) {
  // Kiểm tra phòng thủ: nếu header secret không tồn tại hoặc không phải chuỗi
  if (!headerSecret || typeof headerSecret !== 'string') {
    return false;
  }

  const expectedSecret = config.vietqrWebhookSecret;
  const headerBuffer = Buffer.from(headerSecret);
  const expectedBuffer = Buffer.from(expectedSecret);

  // So sánh độ dài trước để tránh lỗi sập server của hàm timingSafeEqual
  if (headerBuffer.length !== expectedBuffer.length) {
    return false;
  }

  // So khớp với thời gian xử lý cố định để chống đo thời gian suy đoán mật khẩu
  return crypto.timingSafeEqual(headerBuffer, expectedBuffer);
}

// Hàm tìm kiếm đơn hàng dựa trên nội dung chuyển khoản (hỗ trợ cả mã ObjectId 24 hex và mã ngắn DH 8 hex)
async function findOrderByContent(content) {
  // 1. Thử tìm theo mã đầy đủ 24 ký tự hex của MongoDB ObjectId
  const fullId = extractOrderIdFromContent(content);
  if (fullId && mongoose.Types.ObjectId.isValid(fullId)) {
    const order = await Order.findById(fullId);
    if (order) {
      return order;
    }
  }

  // 2. Thử tìm theo mã ngắn DH + 8 ký tự hex cuối (tương thích toResult của orderService)
  const shortMatch = typeof content === 'string' ? content.match(/\bDH([0-9a-f]{8})\b/i) : null;
  if (shortMatch) {
    const shortCode = shortMatch[1].toLowerCase();
    // Tìm đơn hàng có đuôi _id trùng với 8 ký tự này
    const order = await Order.findOne({
      $expr: {
        $eq: [
          { $toLower: { $substrCP: [{ $toString: '$_id' }, 16, 8] } },
          shortCode,
        ],
      },
    });
    if (order) {
      return order;
    }
  }

  return null;
}

// Hàm bắt lỗi các trường hợp trùng tranction id
// async function saveTransactionLog(data){
//   try{
//     await PaymentTransaction.create(data);
//     return true;
//   }
//   catch(err){
//     if (isDuplicateKeyError(err)) return false;
//     throw err;
//   }
// }

// Hàm xử lý gói tin Webhook VietQR từ cổng thanh toán
export async function processVietQrWebhook(payload, headerSecret) {
  // BƯỚC 1: Xác thực secret key từ Header
  const isValidSecret = verifyWebhookSecret(headerSecret);
  if (!isValidSecret) {
    throw new AppError(401, 'UNAUTHORIZED', 'Secret key của webhook không hợp lệ');
  }

  const { gateway, transactionId, amount, content, accountNumber } = payload;

  // BƯỚC 2: Kiểm tra Idempotency (mã giao dịch ngân hàng đã xử lý chưa)
  const existingTx = await PaymentTransaction.findOne({ gatewayTransactionId: transactionId });
  if (existingTx) {
    return { success: true, message: 'Giao dịch đã được xử lý trước đó' };
  }

  // BƯỚC 3: Tìm đơn hàng tương ứng trong cơ sở dữ liệu
  const order = await findOrderByContent(content);

  // Nếu không tìm thấy đơn hàng nào khớp với nội dung chuyển khoản
  if (!order) {
    await PaymentTransaction.create({
      gateway,
      gatewayTransactionId: transactionId,
      accountNumber,
      amount,
      transferContent: content,
      status: 'ignored',
      failureReason: 'ORDER_NOT_FOUND_OR_INVALID_CONTENT',
      rawPayload: payload,
    });
    return { success: true, message: 'Bỏ qua giao dịch do không khớp đơn hàng nào' };
  }

  // Nếu đơn hàng không dùng phương thức chuyển khoản hoặc đã bị hủy
  if (order.paymentMethod !== 'bank' || order.status === 'cancelled') {
    await PaymentTransaction.create({
      orderId: order._id,
      gateway,
      gatewayTransactionId: transactionId,
      accountNumber,
      amount,
      transferContent: content,
      status: 'ignored',
      failureReason: 'ORDER_NOT_ELIGIBLE_FOR_PAYMENT',
      rawPayload: payload,
    });
    return { success: true, message: 'Đơn hàng không hợp lệ để nhận thanh toán' };
  }

  // Nếu khách chuyển tiền lần 2 cho đơn hàng đã thanh toán rồi (lưu vết để admin hoàn tiền)
  if (order.paymentStatus === 'paid') {
    await PaymentTransaction.create({
      orderId: order._id,
      gateway,
      gatewayTransactionId: transactionId,
      accountNumber,
      amount,
      transferContent: content,
      status: 'ignored',
      failureReason: 'ORDER_ALREADY_PAID',
      rawPayload: payload,
    });
    await Order.updateOne(
      { _id: order._id },
      { $set: { adminNote: `CẢNH BÁO: Khách chuyển tiền lần 2 (${amount}đ, Mã GD: ${transactionId}) khi đơn đã thanh toán.` } },
    );
    return { success: true, message: 'Đơn hàng này đã được thanh toán rồi' };
  }

  // BƯỚC 4: Kiểm tra số tiền nhận được có đủ giá trị đơn hàng không
  if (amount < order.total) {
    await PaymentTransaction.create({
      orderId: order._id,
      gateway,
      gatewayTransactionId: transactionId,
      accountNumber,
      amount,
      transferContent: content,
      status: 'failed',
      failureReason: 'AMOUNT_UNDERPAID',
      rawPayload: payload,
    });
    // Ghi chú cảnh báo trực tiếp vào đơn hàng để quản trị viên dễ dàng phát hiện
    await Order.updateOne(
      { _id: order._id },
      { $set: { adminNote: `CẢNH BÁO: Khách chuyển thiếu tiền! Đã nhận ${amount}đ / Cần ${order.total}đ (Mã GD: ${transactionId})` } },
    );
    return { success: false, message: 'Số tiền chuyển khoản thiếu so với đơn hàng' };
  }

  // BƯỚC 5: Thực hiện cập nhật nguyên tử trong một Transaction (Mongoose withTransaction)
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // 1. Ghi lại lịch sử giao dịch thành công
      await PaymentTransaction.create(
        [
          {
            orderId: order._id,
            gateway,
            gatewayTransactionId: transactionId,
            accountNumber,
            amount,
            transferContent: content,
            status: 'success',
            rawPayload: payload,
          },
        ],
        { session },
      );

      // 2. Cập nhật trạng thái đơn hàng sang paid và confirmed
      const updateFields = {
        paymentStatus: 'paid',
        status: order.status === 'pending' ? 'confirmed' : order.status,
        paidAt: new Date(),
      };

      // Nếu khách chuyển thừa tiền, ghi chú số tiền chênh lệch vào adminNote để hoàn trả
      if (amount > order.total) {
        const excess = amount - order.total;
        updateFields.adminNote = `LƯU Ý: Khách chuyển DƯ TIỀN! Đã nhận ${amount}đ / Cần ${order.total}đ (Dư ${excess}đ). Cần liên hệ hoàn tiền thừa cho khách.`;
      }

      await Order.updateOne(
        { _id: order._id, paymentStatus: 'pending' },
        { $set: updateFields },
        { session },
      );
    });
  } finally {
    // Đảm bảo luôn đóng session sau khi hoàn thành
    await session.endSession();
  }

  return { success: true, message: 'Xác nhận thanh toán đơn hàng thành công' };
}

// Hàm lấy trạng thái thanh toán của một đơn hàng (phục vụ khách kiểm tra)
export async function getOrderPaymentStatus(orderId, userId, userRole) {
  // Kiểm tra mã đơn có đúng định dạng ObjectId không
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy đơn hàng');
  }

  const order = await Order.findById(orderId).select('userId paymentStatus status paidAt');
  if (!order) {
    throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy đơn hàng');
  }

  // Kiểm tra phân quyền: Khách chỉ được xem đơn hàng của chính mình (OWASP A01)
  if (userRole !== 'admin' && order.userId.toString() !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền xem đơn hàng này');
  }

  return {
    orderId: order._id,
    paymentStatus: order.paymentStatus,
    status: order.status,
    paidAt: order.paidAt,
  };
}
