# Kế hoạch Triển khai: Lớp Kiểm soát Đầu vào & Phòng chống Lỗ hổng Ứng dụng Web

> **Dành cho Agentic Workers:** Sử dụng tài liệu này để triển khai từng bước có kiểm thử (test-driven) và kiểm tra tính tương thích với toàn bộ hệ thống hiện tại. Sử dụng cú pháp checkbox (`- [x]`) để theo dõi tiến độ.

**Mục tiêu:** Xây dựng lớp bảo mật toàn diện cho trang Thanh toán (Checkout) và toàn bộ ứng dụng web: Chống SQL Injection / NoSQL Injection, XSS, bảo vệ Session Cookie với HttpOnly, và chống File Inclusion (LFI/RFI) / Path Traversal.

**Đặc tả kỹ thuật:** [docs/superpowers/specs/2026-11-21-security-input-validation-specs.md](file:///d:/CODEoD/ngonngukichban\project\webthuongmaidientu\docs\superpowers\specs\2026-11-21-security-input-validation-specs.md)

**Nhánh Git mục tiêu:** `feat/security-input-validation`

---

## Danh mục Công việc (Task Breakdown)

### Giai đoạn 1: Chuẩn bị Nhánh & Thư viện Bảo mật
- [x] **Task 1.1: Tạo nhánh Git mới**
  - Chuyển sang nhánh mới từ nhánh hiện tại: `feat/security-input-validation`
- [x] **Task 1.2: Cài đặt các gói thư viện bảo mật cho Backend**
  - Cài đặt `helmet` (HTTP security headers: CSP, nosniff, frameguard)
  - Cài đặt `express-mongo-sanitize` (làm sạch toán tử NoSQL `$`, `.`)
  - Tương thích Express 5 không gây xung đột getter `req.query`.

---

### Giai đoạn 2: Lớp Middleware Bảo mật & Chống LFI/RFI
- [x] **Task 2.1: Xây dựng Middleware Chống Path Traversal & LFI/RFI**
  - Tạo file `backend/src/middleware/pathTraversalGuard.js`:
    - Quét `req.originalUrl`, `req.query`, `req.params`, và `req.body`.
    - Phát hiện các mẫu ký tự dò đường dẫn: `..`, `../`, `..\`, `%2e%2e`, null-byte injection (`%00`, `\0`).
    - Chặn đứng các nỗ lực truy cập vào các tệp/thư mục nhạy cảm: `.env`, `.git`, `package.json`, `config.js`, `etc/passwd`, `proc/`, `windows/`.
    - Trả về mã lỗi HTTP `400 BAD_REQUEST` với mã lỗi chuẩn `MALICIOUS_REQUEST`.
- [x] **Task 2.2: Tích hợp Helmet & NoSQL Sanitizer vào Express**
  - Tạo `backend/src/middleware/mongoSanitize.js` tương thích Express 5.
  - Cập nhật `backend/src/app.js`:
    - Gắn `helmet()` với cấu hình Content Security Policy (CSP), `X-Content-Type-Options: nosniff`.
    - Gắn `express5MongoSanitize()` để tự động loại bỏ các key bắt đầu bằng `$` hoặc chứa `.`.
    - Gắn `pathTraversalGuard` trước router chính.
- [x] **Task 2.3: Gia cố Điểm Truy xuất File & Ảnh (Image Endpoints)**
  - Đảm bảo `req.params.id` bắt buộc phải là MongoDB ObjectId hợp lệ (24 ký tự hex) qua `toObjectId`.
  - Không có bất kỳ hàm `fs.readFile`, `res.sendFile` nào phụ thuộc vào input trực tiếp của người dùng.
  - Kiểm soát chặt MIME types khi upload: chỉ nhận `image/jpeg`, `image/png`, `image/webp`. Cấm tuyệt đối SVG (chứa script XSS) và file thực thi.

---

### Giai đoạn 3: Kiểm duyệt Đầu vào Nghiêm ngặt (Chống SQLi & NoSQLi)
- [x] **Task 3.1: Nâng cấp Zod Schema cho Đơn hàng & Trang Thanh toán**
  - Cập nhật `backend/src/validators/order.js`:
    - `fullName`: Độ dài 2 - 100 ký tự. Regex tiếng Việt & tiếng Anh an toàn. Cấm các ký tự tiêm nhiễm SQL/XSS (`'`, `"`, `;`, `--`, `/*`, `*/`, `<`, `>`, `\`).
    - `phone`: Regex số điện thoại di động Việt Nam `/^(?:0|\+?84)[0-9]{9}$/`. Bác bỏ mọi payload SQL/XSS trong ô SĐT.
    - `address`: Độ dài 5 - 250 ký tự. Chỉ cho phép các ký tự địa chỉ hợp lệ, chặn thẻ HTML và từ khóa SQL injection.
    - `promotionCode`: Regex `/^[A-Z0-9_-]{3,20}$/i`.
    - `requestKey`: Regex an toàn `/^[a-zA-Z0-9_-]{8,100}$/`.
- [x] **Task 3.2: Kiểm duyệt Giỏ hàng & Số lượng Thiết bị**
  - Cập nhật `backend/src/validators/cart.js`:
    - `productId`: Bắt buộc kiểm tra định dạng 24 ký tự hex (`objectIdRegex`).
    - `quantity`: Số nguyên dương `z.number().int().min(1).max(99)`. Ngăn chặn hoàn toàn số âm (`-1`), số thực (`1.5`), hoặc số quá lớn gây tràn bộ nhớ.
- [x] **Task 3.3: Kiểm duyệt Đánh giá (Review) & Tìm kiếm Sản phẩm**
  - Cập nhật `backend/src/validators/review.js`:
    - `comment`: Giới hạn tối đa 1000 ký tự, làm sạch với `sanitizeText`.

---

### Giai đoạn 4: Chống XSS & Bảo vệ Session Cookie
- [x] **Task 4.1: Kiểm tra & Gia cố Session Cookie (HttpOnly)**
  - Cập nhật `backend/src/controllers/authController.js`:
    - Đảm bảo cookie `token` luôn có `httpOnly: true` (ngăn JavaScript truy cập cookie qua `document.cookie`).
    - Đảm bảo `sameSite: 'lax'`, `path: '/'`, và `secure: config.env === 'production'`.
- [x] **Task 4.2: Xây dựng Tiện ích Khử khuẩn XSS (XSS Sanitizer)**
  - Tạo `backend/src/lib/sanitize.js`:
    - Cung cấp hàm `sanitizeText()`, `stripHtml()`, `escapeHtml()`, `isSafeUrl()`.
- [x] **Task 4.3: Gia cố Bảo mật Giao diện Frontend (Next.js)**
  - Cập nhật `frontend/next.config.mjs`:
    - Thêm Security Headers: `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
  - Cập nhật `frontend/src/app/checkout/page.jsx`:
    - Bổ sung kiểm tra client-side regex cho số điện thoại, họ tên và địa chỉ để phản hồi tức thì người dùng khi nhập ký tự nguy hiểm.

---

### Giai đoạn 5: Kiểm thử Bảo mật Tự động (Security Testing)
- [x] **Task 5.1: Viết Bộ Test Chống Tấn công (Security Test Suite)**
  - Tạo file `backend/tests/security.test.js` kiểm thử 10 kịch bản:
    - Test SQLi payloads on fullName, phone, promotionCode (`' OR 1=1--`, `UNION SELECT`) -> 400 Validation Error.
    - Test NoSQLi payload (`{"$gt": ""}`) -> Bị làm sạch / 400.
    - Test XSS payloads (`<script>`, `<img onerror>`) -> Bị từ chối hoặc sanitize sạch khỏi DB.
    - Test Session Cookie -> `HttpOnly`, `SameSite=Lax`, `Path=/` được kiểm tra trực tiếp trên `Set-Cookie`.
    - Test Path Traversal & LFI (`/api/images/../../.env`, `%2e%2e`, `etc/passwd`) -> 400 `MALICIOUS_REQUEST`.
    - Test Quantity tampering (`-1`, `0`, `2.5`, `100`) -> 400.
    - Test Security Headers -> `nosniff`, `x-frame-options`.
  - Kết quả: **10/10 PASS**.
- [x] **Task 5.2: Chạy Hồi quy Toàn bộ Test Suite**
  - Chạy `npm test` toàn bộ 14 test suite của backend: **94/94 PASS, 0 FAIL**.

---

## Tiêu chí Nghiệm thu (Definition of Done)
1. ✅ Nhánh `feat/security-input-validation` đã được tạo và chứa toàn bộ mã nguồn.
2. ✅ Biểu mẫu thanh toán và giỏ hàng được bảo vệ trước SQLi, NoSQLi, XSS và giả mạo số lượng.
3. ✅ Cookie phiên xác thực `token` luôn mang cờ `HttpOnly`, chống đọc trộm qua JavaScript.
4. ✅ Mọi nỗ lực dò quét tệp hệ thống (`..`, `.env`, `etc/passwd`) bị chặn đứng bởi middleware.
5. ✅ Toàn bộ 94 test cases tự động chạy thành công 100%, không phát sinh bất kỳ lỗi hồi quy nào.
