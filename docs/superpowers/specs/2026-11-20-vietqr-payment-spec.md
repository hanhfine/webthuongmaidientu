# Thiết kế chức năng thanh toán tự động qua VietQR Webhook

Ngày: 2026-11-20  
Trạng thái: ĐÃ DUYỆT  
Tài liệu liên quan:
- [webbanhang-design.md](file:///d:/code/NNKB_BM/repo/docs/superpowers/specs/2026-10-31-webbanhang-design.md) (Thiết kế tổng thể hệ thống)
- [CLAUDE.md](file:///d:/code/NNKB_BM/repo/CLAUDE.md) (Hướng dẫn kỹ thuật và invariants)

---

## 1. Mục tiêu và Quyết định kỹ thuật

Mục tiêu: Tự động hóa hoàn toàn quy trình xác nhận thanh toán cho các đơn hàng chọn phương thức chuyển khoản (`paymentMethod: 'bank'`) thông qua Webhook VietQR (tương thích các dịch vụ trung gian biến động số dư như SePay, PayOS, Casso...), thay thế việc admin phải duyệt tay.

| Hạng mục | Quyết định kỹ thuật |
|---|---|
| **Cơ chế QR** | VietQR động chuẩn Napas 247: sinh URL QR kèm số tài khoản, số tiền (`order.total`) và nội dung chuyển khoản duy nhất (`ORDER_<orderId>`). |
| **Cơ chế Webhook** | Backend cung cấp một webhook endpoint nhận `POST` từ dịch vụ quản lý biến động số dư. |
| **Kiến trúc mã nguồn** | Tuân thủ nghiêm ngặt 4 tầng: `routes/webhook.routes.js` → `controllers/webhookController.js` → `services/paymentService.js` → `models/PaymentTransaction.js`. |
| **Idempotency** | Lưu vết mã giao dịch ngân hàng (`gatewayTransactionId`) kèm unique index để đảm bảo một giao dịch tiền chỉ được xử lý đúng một lần duy nhất. |
| **Nền tảng bảo mật** | Thiết kế sẵn sàng đáp ứng và nâng cấp theo các tiêu chuẩn OWASP Top 10. |

---

## 2. Kiến trúc và Luồng dữ liệu

```
[Khách hàng]             [Frontend (Next.js)]           [Backend (Express)]         [Dịch vụ Webhook VietQR]
     │                           │                              │                               │
     │── 1. Đặt hàng CK ────────>│                              │                               │
     │                           │── 2. POST /api/orders ──────>│ (Lưu order, status: pending)  │
     │                           │<─ 3. Trả về Order + VietQR ──│                               │
     │<─ 4. Hiển thị mã QR ──────│                              │                               │
     │                           │                              │                               │
     │── 5. Quét QR & CK ──────────────────────────────────────────────────────────────────────>│
     │                           │                              │<─ 6. POST /api/webhooks/vietqr│
     │                           │                              │   (Header: Secret/Signature)  │
     │                           │                              │── 7. Verify & withTransaction:│
     │                           │                              │   - Ghi PaymentTransaction    │
     │                           │                              │   - paymentStatus = 'paid'    │
     │                           │                              │   - status = 'confirmed'      │
     │                           │                              │─> Trả HTTP 200 OK ───────────>│
     │                           │                              │                               │
     │                           │── 8. GET /payment-status ───>│                               │
     │<─ 9. Báo thành công! ─────│<─ Trả { paymentStatus: paid }│                               │
```

---

## 3. Mô hình dữ liệu (Database Schema)

### 3.1. Collection mới: `payment_transactions` (Model: `PaymentTransaction`)

Lưu trữ mọi giao dịch tiền vào từ Webhook để phục vụ đối soát, tra cứu và chống tấn công Replay.

```javascript
import mongoose from 'mongoose';

const { Schema } = mongoose;

const paymentTransactionSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', index: true },
    gateway: { type: String, required: true }, // 'sepay' | 'payos' | 'vietqr' | ...
    gatewayTransactionId: { type: String, required: true, unique: true }, // Mã giao dịch duy nhất từ ngân hàng
    accountNumber: { type: String }, // Số tài khoản ngân hàng nhận tiền
    amount: { type: Number, required: true }, // Số tiền thực tế nhận được (VND integer)
    transferContent: { type: String, required: true }, // Nội dung chuyển khoản thực tế
    status: {
      type: String,
      enum: ['success', 'ignored', 'failed'],
      default: 'success',
      required: true,
    },
    failureReason: { type: String }, // Lý do nếu thất bại hoặc bỏ qua
    rawPayload: { type: Schema.Types.Mixed }, // Lưu toàn bộ JSON gốc phục vụ audit log
  },
  { timestamps: true }
);

paymentTransactionSchema.index({ gatewayTransactionId: 1 }, { unique: true });
paymentTransactionSchema.index({ orderId: 1, createdAt: -1 });

export const PaymentTransaction = mongoose.model('PaymentTransaction', paymentTransactionSchema);
```

### 3.2. Cập nhật Model: `Order`

Bổ sung trường `paidAt: Date` vào schema của `Order`:
- `paidAt`: Thời điểm hệ thống nhận được thanh toán thành công qua Webhook (hoặc admin xác nhận).

---

## 4. Đặc tả API

### 4.1. Endpoint tiếp nhận Webhook từ VietQR / Cổng thanh toán
- **URL:** `POST /api/webhooks/vietqr`
- **Quyền:** Public (nhưng bắt buộc xác thực qua Header `x-api-key` hoặc chữ ký số HMAC).
- **Headers yêu cầu:**
  - `x-api-key`: Secret token cấu hình trong `process.env.VIETQR_WEBHOOK_SECRET`.
  - `Content-Type`: `application/json`

- **Request Body (Chuẩn hóa):**
```json
{
  "gateway": "MBBank",
  "transactionId": "FT24325981273912",
  "transactionDate": "2026-11-20 20:30:00",
  "accountNumber": "0987654321",
  "amount": 25490000,
  "content": "ORDER 673c4b1f8e91a20012345678"
}
```

- **Mã phản hồi HTTP:**
  - `200 OK`: `{ "success": true, "message": "Transaction processed" }`
  - `400 Bad Request`: `{ "code": "INVALID_PAYLOAD", "message": "Dữ liệu payload không hợp lệ" }`
  - `401 Unauthorized`: `{ "code": "UNAUTHORIZED", "message": "Secret key không hợp lệ" }`

### 4.2. Endpoint kiểm tra trạng thái thanh toán (Polling)
- **URL:** `GET /api/orders/:id/payment-status`
- **Quyền:** `customer` (chỉ được xem đơn hàng của chính mình) hoặc `admin`.
- **Response `200 OK`:**
```json
{
  "orderId": "673c4b1f8e91a20012345678",
  "paymentStatus": "paid",
  "status": "confirmed",
  "paidAt": "2026-11-20T20:30:02.123Z"
}
```

---

## 5. Quy tắc nghiệp vụ cốt lõi (Core Invariants)

1. **Khớp mã đơn hàng (`orderId`):**
   - Dùng Regex trích xuất định dạng `[0-9a-fA-F]{24}` từ trường `content`.
   - Nếu nội dung không chứa ID hợp lệ hoặc đơn hàng không tồn tại:
     - Ghi nhận `PaymentTransaction` với `status = 'ignored'`.
     - Vẫn trả HTTP `200 OK` để webhook provider không gửi lại request liên tục.
2. **Xử lý toàn vẹn trong 1 Transaction (`withTransaction`):**
   - Kiểm tra `gatewayTransactionId` đã tồn tại chưa: nếu có, bỏ qua xử lý (đảm bảo tính idempotent tuyệt đối).
   - Kiểm tra trạng thái đơn: `paymentMethod === 'bank'`, `paymentStatus === 'pending'`, `status !== 'cancelled'`.
   - So khớp số tiền: `amount >= order.total` (chấp nhận thanh toán đủ hoặc thừa, từ chối thanh toán thiếu).
   - Thực hiện cập nhật nguyên tử:
     - Ghi `PaymentTransaction` (`status = 'success'`).
     - Đặt `order.paymentStatus = 'paid'`.
     - Đặt `order.status = 'confirmed'`.
     - Lưu `order.paidAt = new Date()`.
3. **Tuân thủ quy tắc doanh thu của dự án:**
   - Doanh thu vẫn chỉ được tính khi đơn hàng đạt cả hai điều kiện: `status === 'delivered'` và `paymentStatus === 'paid'`, bucketed theo `deliveredAt` (giờ Việt Nam +07:00).

---

## 6. Khung kiến trúc sẵn sàng nâng cấp theo OWASP Top 10

| Tiêu chuẩn OWASP | Rủi ro tiềm ẩn | Thiết kế đối phó trong kiến trúc |
|---|---|---|
| **A01: Broken Access Control** | Người dùng khác dò xem trạng thái thanh toán đơn hàng. | `GET /orders/:id/payment-status` xác thực JWT cookie, kiểm tra nghiêm ngặt quyền sở hữu `order.userId.toString() === req.user.id`. |
| **A02: Cryptographic Failures** | Lộ API key bí mật của Webhook. | Bắt buộc chạy HTTPS khi production. `VIETQR_WEBHOOK_SECRET` lưu trong biến môi trường `.env`, không bao giờ commit vào repo. |
| **A03: Injection & ReDoS** | Nội dung chuyển khoản bị chèn chuỗi độc hại gây ReDoS hoặc lỗi parse. | Dùng Zod schema kiểm tra chặt chẽ payload. Regex trích xuất ID chỉ cho phép tập ký tự hex đúng 24 ký tự `/\b([a-f0-9]{24})\b/i`. |
| **A04: Insecure Design & Race Condition** | Hai webhook bắn song song xử lý trùng giao dịch; khách thanh toán thiếu tiền. | Unique index trên `gatewayTransactionId`. Xử lý trong MongoDB Session Transaction. Kiểm tra điều kiện `amount >= order.total`. |
| **A05: Security Misconfiguration** | Lộ thông tin lỗi hệ thống ra bên ngoài. | Middleware `errorHandler` chuẩn của dự án: chỉ trả về `{ code, message }`, không leak stack trace. |
| **A07: Identification / Auth Failures** | Tấn công Timing Attack để đoán Webhook secret key. | Dùng `crypto.timingSafeEqual` khi so khớp secret key thay vì toán tử `===`. |
| **A08: Software & Data Integrity** | Dữ liệu webhook bị sửa đổi trên đường truyền. | Thiết kế sẵn sàng để chuyển sang kiểm tra chữ ký số HMAC-SHA256 (`x-signature`). |
| **A09: Security Logging & Monitoring** | Không phát hiện được các request giả mạo hoặc giao dịch sai lệch tiền. | Toàn bộ request webhook đều được lưu vào `PaymentTransaction` kèm `rawPayload` và lý do để đối soát và cảnh báo. |
| **A10: SSRF** | Payload webhook chứa URL giả mạo nhằm lừa server gửi request ra ngoài. | Backend tuyệt đối không tạo request ra bên ngoài dựa trên bất kỳ đường link nào gửi trong payload. |

---

## 7. Tiêu chí kiểm thử (Acceptance Criteria)

1. Webhook không có Secret Token hoặc sai Token $\rightarrow$ Trả `401 Unauthorized`.
2. Gửi Webhook với payload không hợp lệ (thiếu số tiền, sai định dạng) $\rightarrow$ Trả `400 Bad Request`.
3. Khách thanh toán đúng tiền, nội dung chứa ID đơn hàng hợp lệ:
   - `PaymentTransaction` được tạo thành công.
   - `order.paymentStatus` chuyển sang `'paid'`, `order.status` chuyển sang `'confirmed'`.
4. Gửi lại cùng một Webhook đã xử lý (`gatewayTransactionId` trùng lặp):
   - Hệ thống không xử lý lại, không cập nhật đơn lần 2, trả về `200 OK` an toàn.
5. Khách chuyển thiếu tiền so với `order.total`:
   - `PaymentTransaction` được tạo với `status = 'failed'`, đơn hàng giữ nguyên `paymentStatus = 'pending'`.
