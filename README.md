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

Chạy test (cần MongoDB đang chạy, dùng DB `webbanhang_test`): `npm test`.

## Tài khoản dev

Chỉ dùng cho môi trường phát triển: admin `admin@shop.local` / `admin12345` (đổi bằng biến môi trường `ADMIN_PASSWORD` khi seed). Mã giảm giá mẫu: `WELCOME10`.
