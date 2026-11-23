# Web bán hàng công nghệ

Website thương mại điện tử bán đồ công nghệ (điện thoại, laptop, phụ kiện) — đồ án môn học. Monorepo gồm `backend/` (Express 5 + Mongoose, API dưới `/api`) và `frontend/` (Next.js, chưa được tạo). Thiết kế: `docs/superpowers/specs/`.

## Chạy nhanh

Yêu cầu: Node.js 22.9+ (cần `--env-file-if-exists`), Docker.

```bash
docker compose up -d --wait        # MongoDB replica set (cần cho transaction)
cd backend
npm install
npm run seed                       # dữ liệu mẫu, chạy lại an toàn
npm run dev                        # API tại http://localhost:4000
```

Lưu ý: `npm run dev`/`npm run seed` đặt `NODE_ENV=development`. `npm start` (không đặt NODE_ENV) bắt buộc phải có `JWT_SECRET`, nếu không server từ chối khởi động; `SHIPPING_FEE` phải là số nguyên không âm.

Chạy test (cần MongoDB đang chạy, dùng DB `webbanhang_test`): `npm test`.

## Kiểm thử thanh toán tự động (VietQR Webhook)

Hệ thống hỗ trợ thanh toán chuyển khoản ngân hàng tự động qua VietQR / SePay.
Xem hướng dẫn chi tiết các kịch bản kiểm thử (Test tự động, Test giả lập PowerShell, Test chuyển tiền thật qua Ngrok) tại: [docs/vietqr-testing-guide.md](docs/vietqr-testing-guide.md).

- Chạy nhanh 9 kịch bản kiểm thử tự động của luồng thanh toán:
  ```powershell
  cd backend
  $env:NODE_ENV="test"; node --env-file-if-exists=.env --test tests/payment-webhook.test.js
  ```

## Tài khoản dev

Chỉ dùng cho môi trường phát triển: admin `admin@shop.local` / `admin12345` (đổi bằng biến môi trường `ADMIN_PASSWORD` khi seed). Mã giảm giá mẫu: `WELCOME10`.
