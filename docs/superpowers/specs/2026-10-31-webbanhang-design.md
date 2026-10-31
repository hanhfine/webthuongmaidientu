# Thiết kế website thương mại điện tử bán đồ công nghệ

Ngày: 2026-10-31. Loại dự án: bài tập môn học (Ngôn ngữ kịch bản). Báo cáo Word trước đó chỉ để tham khảo nghiệp vụ.

## 1. Mục tiêu và quyết định chính

Website B2C cho một cửa hàng đồ công nghệ (điện thoại, laptop, phụ kiện).

| Hạng mục | Quyết định |
|---|---|
| Framework | Next.js (App Router), JavaScript thuần (ESM) |
| Giao diện | Tailwind CSS, responsive |
| Cơ sở dữ liệu | MongoDB + Mongoose, chạy bằng Docker (replica set 1 node) để dùng transaction |
| Xác thực | Tự viết: `bcrypt` + JWT (`jose`) trong cookie httpOnly |
| API | REST đầy đủ bằng Route Handlers (`/api/...`), giao diện gọi `fetch` |
| Ảnh sản phẩm | Upload, lưu trong MongoDB (collection `images`), tối đa 2 MB, JPEG/PNG/WebP |
| Phạm vi | Cốt lõi + mở rộng vừa (xem mục 6) |

Ngoài phạm vi: thanh toán thật, API vận chuyển, trả góp, chat, đa ngôn ngữ, email xác nhận.

## 2. Kiến trúc

Trang React → `fetch` → Route Handler `/api/...` → Service → Model (Mongoose) → MongoDB.

```
webbanhang/
├─ docker-compose.yml        # MongoDB replica set 1 node
├─ src/
│  ├─ app/
│  │  ├─ (shop)/             # trang khách
│  │  ├─ admin/              # trang quản trị
│  │  ├─ login, register
│  │  └─ api/                # REST handlers
│  ├─ models/                # Mongoose schema
│  ├─ services/              # nghiệp vụ
│  ├─ lib/                   # db.js, auth.js, errors.js
│  ├─ components/
│  └─ middleware.js          # chặn /admin và API quản trị theo vai trò
├─ scripts/seed.js           # admin, danh mục, sản phẩm mẫu
└─ tests/
```

Nguyên tắc:
- Route Handler chỉ kiểm tra dữ liệu vào, kiểm tra quyền, gọi service, trả JSON.
- Mọi nghiệp vụ nằm trong `services/`. Đặt hàng và trừ kho chạy trong một transaction.
- Giá và tồn kho do server đọc lại khi đặt hàng; giá trong giỏ chỉ để hiển thị.

## 3. Mô hình dữ liệu

| Collection | Trường chính | Ghi chú |
|---|---|---|
| users | email (unique, lowercase), passwordHash, fullName, phone, role (customer/admin), isActive | Đăng ký công khai chỉ tạo customer; admin tạo bằng seed; tài khoản khóa không đăng nhập được |
| categories | name, slug (unique), isActive | Đã có sản phẩm thì ẩn, không xóa |
| products | name, slug, categoryId, brand, price, stock, description, specs (object tự do), imageId, ratingAvg, ratingCount, isActive | Index text trên name, brand; index trên categoryId, price |
| images | data (Buffer), contentType, size | Tách riêng để danh sách sản phẩm nhẹ |
| carts | userId (unique), items [{productId, quantity}] | Không lưu giá |
| orders | userId, requestKey, items [{productId, name, price, quantity}], shippingAddress, subtotal, discount, shippingFee, total, promotionCode, paymentMethod (cod/bank), paymentStatus (unpaid/pending/paid), status, deliveredAt | Items nhúng để lịch sử không đổi; unique (userId, requestKey) chống đặt trùng |
| reviews | userId, productId, rating (1-5), comment | Unique (userId, productId); chỉ khi có đơn delivered chứa sản phẩm |
| promotions | code (unique), type (percent/fixed), value, minOrder, maxUses, usedCount, startsAt, endsAt, isActive | usedCount tăng bằng cập nhật có điều kiện trong transaction |

Quy tắc:
- Tiền là số nguyên VND.
- Trạng thái đơn: `pending → confirmed → shipping → delivered`; `cancelled` khi chưa paid.
- COD bắt đầu `unpaid`, chuyển khoản bắt đầu `pending`; chỉ admin đặt `paid`.
- Doanh thu chỉ tính đơn `delivered` và `paid`, theo `deliveredAt`.
- `ratingAvg`/`ratingCount` cập nhật khi có đánh giá.

## 4. API

Lỗi trả `{code, message}` (kèm `fieldErrors` khi sai dữ liệu form).

| Nhóm | Endpoint | Quyền |
|---|---|---|
| Auth | POST /api/auth/register, /login, /logout; GET /api/auth/me | công khai |
| Sản phẩm | GET /api/products?q=&category=&brand=&minPrice=&maxPrice=&sort=&page=; GET /api/products/:id | công khai |
| | POST/PUT/DELETE /api/products (xóa = ẩn) | admin |
| Danh mục | GET /api/categories; POST/PUT/DELETE | đọc công khai, ghi admin |
| Ảnh | GET /api/images/:id (cache); POST /api/images | đọc công khai, upload admin |
| Giỏ hàng | GET /api/cart; POST /api/cart/items; PATCH/DELETE /api/cart/items/:productId | customer |
| Đơn hàng | POST /api/orders; GET /api/orders; GET /api/orders/:id | customer (chỉ đơn của mình) |
| | GET /api/admin/orders; PATCH /api/admin/orders/:id/status, /payment | admin |
| Mã giảm giá | POST /api/promotions/validate; GET/POST/PUT /api/admin/promotions | validate: customer; còn lại admin |
| Đánh giá | GET/POST /api/products/:id/reviews | đọc công khai, ghi customer |
| Người dùng | GET /api/admin/users; PATCH /api/admin/users/:id/status | admin |
| Thống kê | GET /api/admin/stats/revenue?from=&to= | admin |

### Luồng POST /api/orders (một transaction)
1. Có đơn cùng `requestKey` thì trả đơn cũ.
2. Đọc giỏ; rỗng thì báo lỗi.
3. Với mỗi sản phẩm (sắp theo id): kiểm tra đang bán; trừ kho bằng `updateOne({_id, stock: {$gte: n}}, {$inc: {stock: -n}})`. Thiếu hàng thì rollback, báo sản phẩm nào hết.
4. Có mã giảm giá: kiểm tra thời hạn, isActive, minOrder; tăng `usedCount` có điều kiện `usedCount < maxUses`. Giảm không vượt tiền hàng.
5. Tính subtotal, discount, shippingFee (cố định, cấu hình bằng biến môi trường), total.
6. Tạo đơn kèm bản sao tên và giá, đặt paymentStatus ban đầu, xóa giỏ.
7. Commit. Lỗi trước commit thì rollback toàn bộ và giữ giỏ.

### Hủy đơn
Chỉ khi `pending`/`confirmed` và chưa `paid`. Hoàn kho và hoàn lượt mã đúng một lần, bằng cập nhật có điều kiện theo trạng thái cũ.

### Phân quyền
`middleware.js` kiểm tra JWT cookie và vai trò cho `/admin/*` và `/api/admin/*`. Service vẫn kiểm tra `userId` của đơn.

## 5. Giao diện, lỗi, kiểm thử

Giao diện:
- Khách: trang chủ (tìm kiếm, danh mục, nổi bật); danh sách có lọc theo danh mục/hãng/giá, sắp xếp, phân trang; chi tiết (ảnh, specs, đánh giá); giỏ; thanh toán (địa chỉ, COD/chuyển khoản, mã giảm giá, hiện rõ tiền hàng/giảm giá/phí giao/tổng); đơn của tôi.
- Admin: thống kê doanh thu; quản lý sản phẩm (upload ảnh), danh mục, đơn (đổi trạng thái, xác nhận đã thu tiền), người dùng, mã giảm giá.
- Trạng thái đăng nhập lấy từ `GET /api/auth/me`, giữ bằng một React context nhỏ.

Lỗi: lớp `AppError(code, status, message)` và hàm bọc chung cho Route Handler; dữ liệu vào kiểm tra bằng `zod`; lỗi không lường trước trả 500 chung, chi tiết chỉ ghi log. Mật khẩu băm bcrypt, cookie httpOnly + sameSite, không trả passwordHash, kiểm tra loại và dung lượng ảnh.

Kiểm thử (chạy với MongoDB replica set thật, không mock DB):
- Hai người cùng mua món còn 1: chỉ một đơn thành công.
- Lỗi giữa chừng: rollback đơn, tồn kho, giỏ, lượt mã.
- Gửi lại cùng `requestKey`: không tạo đơn thứ hai.
- Mã hết hạn hoặc hết lượt bị từ chối.
- Hủy đơn hoàn kho đúng một lần.
- Doanh thu chỉ tính đơn delivered và paid.
- Customer không truy cập được API admin hay đơn người khác.
- Đánh giá chỉ khi đã nhận hàng; gửi lại thì sửa.

## 6. Danh sách tính năng (mức "vừa")

Đăng ký/đăng nhập; xem, tìm, lọc sản phẩm; giỏ hàng; đặt hàng COD và chuyển khoản thủ công; mã giảm giá; theo dõi đơn; đánh giá sản phẩm; admin CRUD sản phẩm/danh mục; quản lý đơn; quản lý người dùng (khóa/mở); quản lý mã giảm giá; thống kê doanh thu cơ bản.
