// Bộ kiểm tra dữ liệu đầu vào cho Webhook thanh toán VietQR
import { z } from 'zod';

// Regex tìm chuỗi ObjectId MongoDB 24 ký tự hex (hỗ trợ cả tiền tố ORDER/DH đứng liền hoặc cách rời)
const OBJECT_ID_REGEX = /(?:ORDER|DH|[^\da-z]|^)\s*([a-f0-9]{24})(?=[^\da-z]|$)/i;

// Schema kiểm tra cấu trúc dữ liệu gói tin Webhook gửi từ cổng thanh toán
export const vietQrWebhookSchema = z.object({
  // Tên cổng hoặc ngân hàng gửi tới (bắt buộc)
  gateway: z.string().trim().min(1, 'Gateway bắt buộc'),
  // Mã giao dịch từ phía ngân hàng (bắt buộc)
  transactionId: z.string().trim().min(1, 'Transaction ID bắt buộc'),
  // Số tiền nhận được (bắt buộc là số nguyên dương VND)
  amount: z.number().int('Số tiền phải là số nguyên').positive('Số tiền phải lớn hơn 0'),
  // Nội dung chuyển khoản khách nhập
  content: z.string().default(''),
  // Số tài khoản nhận tiền (tùy chọn)
  accountNumber: z.string().trim().optional(),
  // Thời gian giao dịch (tùy chọn)
  transactionDate: z.string().trim().optional(),
});

// Hàm tiện ích trích xuất an toàn orderId (24 ký tự hex) từ nội dung chuyển khoản
export function extractOrderIdFromContent(content) {
  // Kiểm tra phòng thủ: nếu nội dung rỗng hoặc không phải chuỗi thì bỏ qua
  if (!content || typeof content !== 'string') {
    return null;
  }

  // Tìm kiếm chuỗi 24 ký tự hex phù hợp với định dạng ObjectId của MongoDB
  const match = content.match(OBJECT_ID_REGEX);
  // Nếu không tìm thấy mã đơn hợp lệ thì trả về null
  if (!match) {
    return null;
  }

  // Trả về orderId dạng chữ thường
  return match[1].toLowerCase();
}
