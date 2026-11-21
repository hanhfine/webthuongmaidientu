# Kế hoạch triển khai: Thanh toán tự động qua VietQR Webhook

Tài liệu thiết kế: [2026-11-20-vietqr-payment-spec.md](file:///d:/code/NNKB_BM/repo/docs/superpowers/specs/2026-11-20-vietqr-payment-spec.md)  
Mục tiêu: Xây dựng hoàn chỉnh tính năng xử lý thanh toán tự động qua VietQR Webhook trên backend Express + Mongoose, đảm bảo an toàn giao dịch, tính idempotent và sẵn sàng nâng cấp theo OWASP Top 10.

---

## Ràng buộc kỹ thuật (Global Constraints)

- **Kiến trúc 4 tầng nghiêm ngặt:** `routes → controllers → services → models`.
- **Mongoose 9:** Sử dụng `returnDocument: 'after'` thay vì `new: true` trong `findOneAndUpdate`.
- **Transaction:** Mọi thao tác cập nhật đơn hàng và ghi nhận thanh toán thành công phải nằm trong `withTransaction` của MongoDB replica set.
- **Bảo mật:** So khớp Secret Token bằng `crypto.timingSafeEqual` để chống Timing Attack.
- **Tiền tệ:** Luôn là số nguyên VND (integer).
- **Kiểm thử:** Chạy với MongoDB replica set thật qua Docker (database `webbanhang_test`), chạy tuần tự.

---

## Danh sách Task triển khai

### Task 1: Cấu hình môi trường & Schema Mongoose

- [x] **Step 1: Cập nhật cấu hình Backend**
  - Thêm `vietqrWebhookSecret` vào [backend/src/config.js](file:///d:/code/NNKB_BM/repo/backend/src/config.js) (sử dụng secret dev mặc định khi `NODE_ENV === 'development'` hoặc `'test'`).
  - Thêm biến `VIETQR_WEBHOOK_SECRET` vào [backend/.env.example](file:///d:/code/NNKB_BM/repo/backend/.env.example).

- [x] **Step 2: Tạo Model `PaymentTransaction`**
  - Tạo file [backend/src/models/PaymentTransaction.js](file:///d:/code/NNKB_BM/repo/backend/src/models/PaymentTransaction.js).
  - Định nghĩa schema: `orderId`, `gateway`, `gatewayTransactionId` (unique index), `accountNumber`, `amount`, `transferContent`, `status` (`enum: ['success', 'ignored', 'failed']`), `failureReason`, `rawPayload`.

- [x] **Step 3: Cập nhật Model `Order`**
  - Sửa [backend/src/models/Order.js](file:///d:/code/NNKB_BM/repo/backend/src/models/Order.js): Thêm trường `paidAt: Date`.

---

### Task 2: Schema Zod Validator & Helper trích xuất mã đơn

- [x] **Step 1: Tạo Schema Zod cho Webhook Payload**
  - Tạo file [backend/src/validators/webhook.js](file:///d:/code/NNKB_BM/repo/backend/src/validators/webhook.js).
  - Định nghĩa `vietQrWebhookSchema`:
    - `gateway`: String non-empty.
    - `transactionId`: String non-empty.
    - `amount`: Number nguyên dương (`z.number().int().positive()`).
    - `content`: String.
    - `accountNumber`: String optional.
    - `transactionDate`: String optional.

- [x] **Step 2: Viết hàm tiện ích trích xuất `orderId`**
  - Thêm hàm `extractOrderIdFromContent(content)` trong `webhook.js`.
  - Sử dụng Regex `/\b([a-f0-9]{24})\b/i` để trích xuất ObjectId 24 ký tự hex an toàn, tránh ReDoS.

---

### Task 3: Tầng nghiệp vụ (`services/paymentService.js`)

- [x] **Step 1: Tạo `paymentService.js`**
  - Tạo file [backend/src/services/paymentService.js](file:///d:/code/NNKB_BM/repo/backend/src/services/paymentService.js).

- [x] **Step 2: Triển khai hàm `processVietQrWebhook`**
  - Kiểm tra `headerSecret` với `config.vietqrWebhookSecret` bằng `crypto.timingSafeEqual`. Ném `AppError(401, 'UNAUTHORIZED')` nếu không khớp.
  - Kiểm tra Idempotency: Kiểm tra nếu `gatewayTransactionId` đã tồn tại trong `PaymentTransaction` → trả về `{ success: true, message: 'Already processed' }`.
  - Trích xuất `orderId`: Nếu không tìm thấy hoặc `orderId` không hợp lệ:
    - Lưu `PaymentTransaction` với `status: 'ignored'`, `failureReason: 'ORDER_NOT_FOUND_OR_INVALID_CONTENT'`.
    - Trả về `{ success: true, message: 'Ignored' }`.
  - Tìm `Order` theo `orderId`:
    - Nếu đơn không tồn tại, hoặc `paymentMethod !== 'bank'`, hoặc `paymentStatus !== 'pending'`, hoặc `status === 'cancelled'`:
      - Lưu `PaymentTransaction` (`status: 'ignored'`), trả về `{ success: true, message: 'Ignored' }`.
  - Kiểm tra số tiền: Nếu `amount < order.total`:
    - Lưu `PaymentTransaction` với `status: 'failed'`, `failureReason: 'AMOUNT_UNDERPAID'`.
    - Trả về `{ success: true, message: 'Underpaid' }`.
  - Mở `withTransaction`:
    - Tạo bản ghi `PaymentTransaction` (`status: 'success'`).
    - Cập nhật `Order`: `paymentStatus = 'paid'`, `status = 'confirmed'`, `paidAt = new Date()`.
  - Trả về `{ success: true, message: 'Order payment confirmed' }`.

- [x] **Step 3: Triển khai hàm `getOrderPaymentStatus`**
  - Nhận `orderId`, `userId`, `userRole`.
  - Kiểm tra quyền: Nếu `userRole !== 'admin'` và `order.userId.toString() !== userId` → ném `AppError(403, 'FORBIDDEN')`.
  - Trả về `{ orderId: order._id, paymentStatus: order.paymentStatus, status: order.status, paidAt: order.paidAt }`.

---

### Task 4: Controller & Gắn Routes

- [x] **Step 1: Tạo Controller**
  - Tạo file [backend/src/controllers/webhookController.js](file:///d:/code/NNKB_BM/repo/backend/src/controllers/webhookController.js).
  - Hàm `handleVietQrWebhook`: Parse body bằng `vietQrWebhookSchema`, lấy header `x-api-key`, gọi `paymentService.processVietQrWebhook`, trả JSON HTTP 200.

- [x] **Step 2: Định tuyến Webhook & Polling**
  - Tạo file [backend/src/routes/webhook.routes.js](file:///d:/code/NNKB_BM/repo/backend/src/routes/webhook.routes.js): Gắn `POST /api/webhooks/vietqr`.
  - Sửa [backend/src/routes/order.routes.js](file:///d:/code/NNKB_BM/repo/backend/src/routes/order.routes.js): Thêm route `GET /api/orders/:id/payment-status` (gắn middleware `authenticate`).
  - Sửa [backend/src/routes/index.js](file:///d:/code/NNKB_BM/repo/backend/src/routes/index.js): Đăng ký `webhook.routes.js` vào router tổng `/api`.

---

### Task 5: Kiểm thử tự động (`tests/payment-webhook.test.js`)

- [x] **Step 1: Tạo file test tích hợp**
  - Tạo file [backend/tests/payment-webhook.test.js](file:///d:/code/NNKB_BM/repo/backend/tests/payment-webhook.test.js).
- [x] **Step 2: Viết các kịch bản kiểm thử**
  - Test 1: Bị từ chối 401 khi thiếu hoặc sai header `x-api-key`.
  - Test 2: Bị từ chối 400 khi payload thiếu trường hoặc amount âm.
  - Test 3: Thanh toán thành công (order chuyển sang `paid` và `confirmed`, `paidAt` được gán, `PaymentTransaction` được lưu).
  - Test 4: Hỗ trợ mã đơn ngắn `DH` + 8 hex.
  - Test 5: Gửi trùng `transactionId` (idempotent, không cập nhật lần 2, trả 200).
  - Test 6: Khách chuyển thiếu tiền (`amount < total`) → `PaymentTransaction` ghi nhận `failed`, đơn giữ nguyên `pending`.
  - Test 7: Khách chuyển dư tiền (`amount > total`) → đơn vẫn duyệt `paid` thành công và ghi chú tiền thừa vào `adminNote`.
  - Test 8: Nội dung chuyển khoản không có mã đơn hợp lệ → ghi nhận `ignored`.
  - Test 9: Polling `GET /api/orders/:id/payment-status` kiểm tra đúng quyền sở hữu đơn.
- [x] **Step 3: Chạy test và xác nhận**
  - Chạy `$env:NODE_ENV="test"; node --env-file-if-exists=.env --test tests/payment-webhook.test.js` để nghiệm thu.
