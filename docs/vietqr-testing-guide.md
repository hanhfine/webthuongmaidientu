# Hướng dẫn kiểm thử thanh toán VietQR Webhook (Local & SePay)

Tài liệu này hướng dẫn chi tiết cách kiểm thử hệ thống thanh toán tự động qua Webhook VietQR (tương thích cổng thanh toán SePay / PayOS) trên môi trường phát triển (Local).

---

## 1. Tổng quan cơ chế thanh toán

Luồng xử lý tự động diễn ra như sau:
1. **Tạo đơn hàng:** Khách hàng tạo đơn với phương thức chuyển khoản ngân hàng (`paymentMethod: 'bank'`), đơn ở trạng thái `pending`.
2. **Khách chuyển khoản:** Khách quét mã VietQR hoặc chuyển khoản với nội dung `DH<8 ký tự cuối ObjectId>` (ví dụ: `DH008BDEAF`).
3. **Cổng thanh toán bắn Webhook:** SePay nhận biến động số dư từ ngân hàng và gửi HTTP POST request đến endpoint `/api/webhooks/vietqr`.
4. **Backend xử lý:**
   - Xác thực bí mật (`Authorization: Apikey <secret>` hoặc header `x-api-key`).
   - Chống xử lý trùng lặp (Idempotency dựa trên `gatewayTransactionId`).
   - Kiểm tra số tiền nhận được so với giá trị đơn hàng.
   - Cập nhật nguyên tử (MongoDB Transaction) đổi trạng thái đơn sang `paid` và `confirmed`, ghi nhận thời gian `paidAt`.

---

## 2. Cách 1: Chạy bộ kiểm thử tự động (Automated Tests)

Phù hợp nhất để kiểm tra tính đúng đắn của toàn bộ logic nghiệp vụ mà không cần bật server hay mạng Internet.

### Yêu cầu:
- MongoDB Docker đang chạy:
  ```powershell
  cd D:\code\NNKB_BM\repo
  docker compose up -d --wait
  ```

### Lệnh chạy test:
Mở PowerShell tại thư mục `backend/`:
```powershell
cd D:\code\NNKB_BM\repo\backend
$env:NODE_ENV="test"; node --env-file-if-exists=.env --test tests/payment-webhook.test.js
```

### 9 kịch bản được kiểm thử tự động:
1. Chặn `401 Unauthorized` nếu thiếu hoặc sai secret key.
2. Chặn `400 Bad Request` nếu payload sai định dạng dữ liệu Zod.
3. Thanh toán thành công: đơn chuyển sang `paid` và `confirmed`, lưu log giao dịch.
4. Hỗ trợ trích xuất mã đơn dạng ngắn `DH` + 8 ký tự hex cuối.
5. Idempotency: Gửi lại giao dịch cũ không bị cộng tiền hay duyệt lần 2.
6. Chuyển thiếu tiền: Đơn giữ nguyên `pending`, ghi chú cảnh báo vào `adminNote`.
7. Chuyển dư tiền: Đơn duyệt thành công, ghi chú số tiền thừa vào `adminNote` để hoàn trả.
8. Nội dung chuyển khoản không có mã đơn: Ghi nhận log `ignored`, không làm sập server.
9. Bảo mật Polling (OWASP A01): Khách chỉ được xem trạng thái đơn của mình, chặn người khác xem trộm.

---

## 3. Cách 2: Test giả lập Webhook bằng PowerShell (Khuyên dùng khi dev)

Không cần tài khoản SePay, không tốn tiền thật, kiểm thử trực tiếp trên server backend đang chạy.

### Bước 1: Khởi động Server Backend
Mở Cửa sổ PowerShell 1:
```powershell
cd D:\code\NNKB_BM\repo\backend
$env:NODE_ENV="development"; node --watch --env-file-if-exists=.env src/server.js
```
*(Server sẽ lắng nghe tại `http://localhost:4000`)*.

### Bước 2: Tạo đơn hàng test (10.000đ)
Mở Cửa sổ PowerShell 2 và chạy lệnh:
```powershell
cd D:\code\NNKB_BM\repo\backend
node --env-file-if-exists=.env -e "
import('./src/lib/db.js').then(async ({ connectDb, disconnectDb }) => {
  await connectDb();
  const { User } = await import('./src/models/User.js');
  const { Order } = await import('./src/models/Order.js');
  let user = await User.findOne();
  if (!user) {
    user = await User.create({ email: 'test@shop.local', passwordHash: '123', fullName: 'Khach Test' });
  }
  const order = await Order.create({
    userId: user._id,
    requestKey: 'test-' + Date.now(),
    items: [{ productId: user._id, name: 'San pham test', price: 10000, quantity: 1 }],
    shippingAddress: { fullName: 'Nguyen Van A', phone: '0900000000', address: 'HN' },
    subtotal: 10000, discount: 0, shippingFee: 0, total: 10000,
    paymentMethod: 'bank', paymentStatus: 'pending', status: 'pending'
  });
  console.log('\n=========================================');
  console.log('MA_DON_HANG (ID):', order._id.toString());
  console.log('NOI_DUNG_CHUYEN_TIEN: DH' + order._id.toString().slice(-8).toUpperCase());
  console.log('SO_TIEN: 10000');
  console.log('=========================================\n');
  await disconnectDb();
});"
```

### Bước 3: Bắn Webhook giả lập SePay
Thay giá trị `DHxxxxxxxx` trong nội dung bên dưới bằng mã in ra ở Bước 2:
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/webhooks/vietqr" -Method POST -Headers @{
  "Authorization" = "Apikey tisan_dev1234567890"
  "Content-Type"  = "application/json"
} -Body '{
  "id": 123456,
  "gateway": "VietinBank",
  "transferAmount": 10000,
  "content": "DHxxxxxxxx chuyen tien",
  "accountNumber": "0379458910"
}'
```

### Bước 4: Kiểm tra kết quả
- Response trả về:
  ```json
  {
    "success": true,
    "message": "Xác nhận thanh toán đơn hàng thành công"
  }
  ```
- Kiểm tra lại trạng thái đơn hàng trong database (hoặc gọi API `GET /api/orders/:id/payment-status`), đơn hàng đã tự động chuyển sang `paid` và `confirmed`.

---

## 4. Cách 3: Test chuyển tiền thật qua Ngrok và SePay (End-to-End)

Dùng khi muốn kiểm thử trải nghiệm quét mã chuyển tiền thật từ app ngân hàng trên điện thoại.

### Bước 1: Mở đường hầm Ngrok
Cần 2 cửa sổ terminal chạy song song:
- **Terminal 1:** Server backend chạy tại cổng 4000 (`node --watch ... src/server.js`).
- **Terminal 2:** Chạy Ngrok:
  ```powershell
  ngrok http 4000
  ```
- Copy link HTTPS công khai (ví dụ: `https://xxxx.ngrok-free.app`).

### Bước 2: Cấu hình trên SePay (my.sepay.vn)
1. **Liên kết ngân hàng:** Vào mục *Ngân hàng* $\rightarrow$ Thêm tài khoản ngân hàng thật (xác thực OTP qua điện thoại để SePay có quyền đọc biến động số dư).
2. **Cấu hình Webhook:** Vào mục *Tích hợp Webhook* $\rightarrow$ Thêm Webhook:
   - **URL nhận Webhook:** `https://xxxx.ngrok-free.app/api/webhooks/vietqr`
   - **Loại giao dịch:** Tiền vào
   - **Định dạng dữ liệu:** JSON
   - **Bảo mật:** Chọn `API Key`, điền mã trùng với `VIETQR_WEBHOOK_SECRET` trong `.env` (`tisan_dev1234567890`).

### Bước 3: Chuyển tiền thật bằng App ngân hàng
1. Tạo 1 đơn hàng test để lấy mã chuyển khoản `DH...`.
2. Mở app ngân hàng quét mã VietQR hoặc chuyển khoản đúng số tiền và nội dung `DH...`.
3. Khi tiền vào tài khoản:
   - Ngrok sẽ nhận request: `POST /api/webhooks/vietqr 200 OK`.
   - Backend tự động cập nhật đơn hàng thành công.

---

## 5. Xử lý sự cố thường gặp (Troubleshooting)

| Mã lỗi | Nguyên nhân | Cách khắc phục |
| :--- | :--- | :--- |
| **502 Bad Gateway** | Ngrok không kết nối được tới cổng 4000 do Server Backend chưa chạy hoặc bị tắt. | Bật lại backend: `node --watch --env-file-if-exists=.env src/server.js`. |
| **400 Bad Request** | Gói tin gửi sang thiếu trường bắt buộc (như số tiền, mã giao dịch). | Kiểm tra Zod schema, đảm bảo trường số tiền (`transferAmount` hoặc `amount`) là số nguyên dương. |
| **401 Unauthorized** | Mã bí mật Webhook không khớp với `VIETQR_WEBHOOK_SECRET` trong `.env`. | Kiểm tra Header `Authorization: Apikey ...` hoặc `x-api-key` trên SePay so với file `.env`. |
| **Đã chuyển tiền nhưng terminal không phản hồi** | SePay chưa nhận được thông báo biến động số dư từ ngân hàng. | Kiểm tra lại mục *Giao dịch* trên SePay xem đã có dòng tiền vào chưa, và kiểm tra trạng thái liên kết ngân hàng trên SePay. |
