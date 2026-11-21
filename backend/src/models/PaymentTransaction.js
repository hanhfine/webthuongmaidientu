// Model lưu vết các giao dịch thanh toán từ Webhook ngân hàng / VietQR
import mongoose from 'mongoose';

const { Schema } = mongoose;

// Schema chi tiết cho một giao dịch nhận từ Webhook
const paymentTransactionSchema = new Schema(
  {
    // Đơn hàng tương ứng (nếu tìm thấy từ nội dung chuyển khoản)
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', index: true },
    // Tên cổng hoặc ngân hàng gửi webhook (ví dụ: sepay, payos, mbbank)
    gateway: { type: String, required: true },
    // Mã giao dịch duy nhất từ ngân hàng (đảm bảo tính idempotent, không xử lý trùng)
    gatewayTransactionId: { type: String, required: true, unique: true },
    // Số tài khoản ngân hàng nhận tiền
    accountNumber: { type: String },
    // Số tiền thực tế nhận được (số nguyên VND)
    amount: { type: Number, required: true },
    // Nội dung chuyển khoản thực tế từ khách hàng
    transferContent: { type: String, required: true },
    // Trạng thái xử lý giao dịch: success (thành công), ignored (bỏ qua), failed (lỗi)
    status: {
      type: String,
      enum: ['success', 'ignored', 'failed'],
      default: 'success',
      required: true,
    },
    // Lý do thất bại hoặc bỏ qua nếu có (ví dụ: AMOUNT_UNDERPAID, ORDER_NOT_FOUND)
    failureReason: { type: String },
    // Lưu toàn bộ payload JSON gốc phục vụ đối soát và audit log
    rawPayload: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

// Đánh unique index cho mã giao dịch ngân hàng để chống xử lý trùng lặp
paymentTransactionSchema.index({ gatewayTransactionId: 1 }, { unique: true });
// Đánh index cho orderId và thời gian tạo để tăng tốc truy vấn lịch sử
paymentTransactionSchema.index({ orderId: 1, createdAt: -1 });

export const PaymentTransaction = mongoose.model('PaymentTransaction', paymentTransactionSchema);