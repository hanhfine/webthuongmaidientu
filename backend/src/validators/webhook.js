// Bộ kiểm tra dữ liệu đầu vào cho Webhook thanh toán VietQR
import { z } from 'zod';

// Regex tìm chuỗi ObjectId MongoDB 24 ký tự hex (hỗ trợ cả tiền tố ORDER/DH đứng liền hoặc cách rời)
const OBJECT_ID_REGEX = /(?:ORDER|DH|[^\da-z]|^)\s*([a-f0-9]{24})(?=[^\da-z]|$)/i;

// Schema kiểm tra cấu trúc dữ liệu gói tin Webhook gửi từ cổng thanh toán
export const vietQrWebhookSchema = z.preprocess((val) => {
  if (!val || typeof val !== 'object') return val;
  return {
    ...val,
    // Nếu SePay gửi "id" thì tự đổi thành "transactionId"
    transactionId: val.transactionId ?? (val.id !== undefined ? String(val.id) : undefined),
    // Nếu SePay gửi "transferAmount" thì tự đổi thành "amount"
    amount: val.amount ?? val.transferAmount,
    // Nếu SePay gửi "description" thì lấy làm "content"
    content: val.content ?? val.description ?? '',
  };
}, z.object({
  gateway: z.string().trim().min(1, 'Gateway bắt buộc'),
  transactionId: z.string().trim().min(1, 'Transaction ID bắt buộc'),
  amount: z.number().int('Số tiền phải là số nguyên').positive('Số tiền phải lớn hơn 0'),
  content: z.string().default(''),
  accountNumber: z.string().trim().optional(),
  transactionDate: z.string().trim().optional(),
}));

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
