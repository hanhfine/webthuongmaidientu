# Thiết kế Chi tiết Giao diện Người dùng (Frontend Specifications)

**Ngày:** 2026-11-20  
**Dự án:** Website Thương mại Điện tử Đồ Công Nghệ (Web Bán Hàng)  
**Tài liệu tham khảo:** Ảnh thực tế phong cách Flagship (Samsung.com, TopZone) & Backend Design `docs/superpowers/specs/2026-10-31-webbanhang-design.md`.

---

## 1. Tầm nhìn & Phong cách Thiết kế (Design Language)

- **Phong cách:** Flagship Tech Luxury (ảnh hưởng từ Samsung.com & Apple/TopZone).
- **Tone màu:** Trắng tinh tế (#FFFFFF) kết hợp Đen sang trọng (#121212 / #18181B) và Điểm nhấn Xanh công nghệ (#0071E3 / #2563EB).
- **Trải nghiệm tương tác (Micro-interactions):**
  1. **Header Mega-Menu:** Rê chuột vào danh mục xổ bảng điều hướng đa cột toàn màn hình (Full-width Mega-Menu) hiển thị sản phẩm nổi bật kèm ảnh và danh sách liên kết nhanh.
  2. **Hero Banner Scroll-Shrink:** Banner chính full-bleed (tràn viền 100vw) khi cuộn chuột xuống sẽ co dần kích thước bề ngang (scale down) khớp với container nội dung (max-w-7xl) có bo góc cong mềm mại.
  3. **Zero-reload Dynamic Tab Switching:** Chuyển đổi qua lại giữa các danh mục sản phẩm ("Mới & Nổi bật", "Di động", "TV & AV", "Gia Dụng", "Phụ kiện"...) đổi dữ liệu tức thì ở phía client, giữ nguyên vị trí cuộn trang.
  4. **Scroll Reveal Animations:** Các khối section, banner giới thiệu tính năng và thẻ sản phẩm có hiệu ứng trượt nhẹ và hiện dần (Fade-in + Slide-up) khi cuộn vào khung nhìn (Viewport).
  5. **Card sản phẩm đa tương tác:** Cho phép chuyển đổi màu sắc (Color swatches) và dung lượng ngay trên card để xem trước ảnh và giá.

---

## 2. Danh mục Màn hình & Yêu cầu Chi tiết (Screen Specifications)

### 2.1. Header & Điều hướng Toàn cục (Global Navigation)

- **Vị trí:** Cố định phía trên (Sticky Header, `backdrop-blur-md bg-white/90 dark:bg-black/80`).
- **Thành phần:**
  - **Logo:** Tên thương hiệu phong cách tối giản.
  - **Menu cấp 1:** Cửa Hàng, Điện Thoại, Laptop, Thiết Bị Đeo, TV & Âm Thanh, Phụ Kiện, Khuyến Mãi.
  - **Công cụ bên phải:** Nút Tìm kiếm (Search modal), Giỏ hàng (kèm huy hiệu Badge số lượng), Nút Tài khoản (Avatar / Tên người dùng hoặc nút Đăng nhập).
- **Cơ chế Mega-Menu khi Hover:**
  - Khi rê chuột vào mục như "Cửa Hàng" hoặc "Điện Thoại":
    - Xổ xuống panel nền trắng/đen mờ rộng 100% chiều ngang.
    - Cột 1 (Sản phẩm nổi bật): Danh sách card mini có ảnh sản phẩm mới nhất (Galaxy S26, iPhone 18 Pro...).
    - Cột 2 (Dòng sản phẩm): Phân loại chi tiết (Flagship, Phổ thông, Tablet...).
    - Cột 3 (Ưu đãi & Khám phá): Các chương trình như Thu cũ đổi mới, Flash sale, Bảo hành VIP.
  - Đóng êm dịu khi chuột rời khỏi phạm vi header và dropdown panel.

### 2.2. Trang Chủ (Home Page — `/`)

- **Hero Banner tương tác cuộn (Scroll-Shrink Hero):**
  - Trạng thái đầu trang: Chiều ngang 100vw, cao 80vh - 90vh, hình ảnh thiết bị flagship sắc nét kèm khẩu hiệu lớn ("Sẵn sàng lên đời, nâng tầm cuộc sống").
  - Khi cuộn xuống (scroll offset 0px -> 300px): Chiều rộng banner tự động co lại thành `max-w-7xl`, bo góc `rounded-3xl` mượt mà, chuyển tiếp sang các khối nội dung bên dưới.
- **Khối "Lựa chọn tối ưu chuẩn sống của bạn" (Tabbed Showcase):**
  - Thanh tab icon ngang: [⭐ Mới & Nổi bật], [📱 Di động], [💻 Laptop/Tablet], [📺 TV & AV], [🎧 Thiết bị đeo], [🔌 Phụ kiện].
  - Bấm chọn tab: Lọc danh sách sản phẩm hiển thị ngay tức thì không reload trang (sử dụng Client State + Filter từ API `/api/products`).
  - Lưới sản phẩm (Product Grid / Carousel):
    - Thẻ card sản phẩm bo tròn, bóng nhẹ.
    - Điểm màu (Color swatches dots): Rê chuột/bấm vào đổi ảnh sản phẩm sang màu tương ứng.
    - Pill chọn cấu hình bộ nhớ (128GB, 256GB, 512GB).
    - Giá bán nổi bật VND và gợi ý trả góp/tháng.
    - Nút CTA: "Mua ngay" (thêm nhanh vào giỏ) và "Tìm hiểu thêm" (chuyển sang trang chi tiết).
- **Khối Feature Highlights (Banner câu chuyện sản phẩm):**
  - Các khối lớn xen kẽ như "Bứt phá khoảnh khắc - Bật lên chất riêng", "Mãn nhãn vượt xa giới hạn".
  - Layout chia đôi: Một bên là hình ảnh thiết bị render 3D cao cấp, một bên là tiêu đề, mô tả và nút điều hướng xem chi tiết.
  - Hiệu ứng Scroll Reveal (Fade-in + Slide-up khi cuộn đến 40% màn hình).
- **Khối "Được đề xuất cho bạn" & "Ưu đãi mới nhất":**
  - Grid sản phẩm tự động lấy các sản phẩm có đánh giá cao (`ratingAvg`) hoặc khuyến mãi đặc biệt.

### 2.3. Trang Danh Sách Sản Phẩm & Tìm Kiếm (`/products`)

- **Thanh Sub-category & Phân loại nhanh:**
  - Hàng icon danh mục con ở đầu trang (Galaxy S, Galaxy Z, Galaxy Tab...).
- **Bộ lọc ngang kết hợp dọc (Smart Filters):**
  - Dropdown pills: [Hãng sản xuất ∨], [Mức giá ∨], [Dung lượng bộ nhớ ∨], [Đánh giá sao ∨].
  - Nút "Xóa tất cả bộ lọc" khi có ít nhất một điều kiện lọc được chọn.
  - Sắp xếp: [Mới nhất, Giá tăng dần, Giá giảm dần, Bán chạy nhất].
- **Lưới sản phẩm:** Hiển thị số lượng tìm thấy ("15 kết quả"), phân trang (Pagination) mượt mà.

### 2.4. Trang Chi Tiết Sản Phẩm (`/products/[slug]`)

- **Khu vực mua hàng chính (Above the fold):**
  - **Cột trái (Gallery):**
    - Khung ảnh lớn sắc nét (hỗ trợ zoom khi hover).
    - Hàng thumbnail con bên dưới (click chuyển ảnh chính, có nút trượt trái/phải nếu nhiều ảnh).
  - **Cột phải (Thông số đặt mua):**
    - Tên sản phẩm, nhãn trạng thái ("Mới", "Hot").
    - Giá bán VND in đậm, hiển thị giá gốc gạch ngang và % giảm giá (nếu có).
    - Bộ chọn phiên bản (Dung lượng: 256GB / 512GB / 1TB / 2TB).
    - Bộ chọn màu sắc (Color options với tên màu và chấm tròn màu trực quan).
    - Box Khuyến mãi (Voucher tặng kèm, giảm giá thanh toán, ưu đãi phụ kiện).
    - Bộ nút CTA: **Thêm vào giỏ hàng** (icon giỏ) và **Mua Ngay** (chuyển thẳng sang trang thanh toán).
- **Khu vực Thông số kỹ thuật (Tech Specs Table):**
  - Trình bày dạng bảng hai cột gọn gàng, rõ ràng (CPU, RAM, Màn hình, Camera, Dung lượng pin, Trọng lượng...).
- **Khu vực Đánh giá & Nhận xét (Reviews & Ratings):**
  - Thống kê sao trung bình (4.8/5) và tổng số lượt đánh giá.
  - Danh sách bình luận của khách hàng đã mua.
  - Form gửi đánh giá (chọn số sao 1-5, viết bình luận) chỉ hiển thị cho khách hàng đã mua và nhận hàng thành công (`delivered`).

### 2.5. Trang Giỏ Hàng (`/cart`)

- **Bố cục hai cột (Two-Column Layout):**
  - **Cột trái (Danh sách sản phẩm):**
    - Tiêu đề "Bạn có X sản phẩm trong giỏ hàng".
    - Mỗi dòng sản phẩm: Ảnh nhỏ, Tên sản phẩm, phiên bản/màu đã chọn, Đơn giá VND.
    - Bộ điều chỉnh số lượng: Nút `[-]` `[ số lượng ]` `[+]` cập nhật tự động qua API `PATCH /api/cart/items/:productId`.
    - Nút Xóa (Icon thùng rác) gọi `DELETE /api/cart/items/:productId`.
    - Khối gợi ý mua kèm (Cross-sell / Upsell): Gợi ý củ sạc, ốp lưng, gói bảo hành.
  - **Cột phải (Bảng tóm tắt thanh toán - Sticky Card):**
    - Ô nhập Voucher / Mã giảm giá + Nút "Áp dụng" (gọi `POST /api/promotions/validate`).
    - Dòng hiển thị: Tổng tiền hàng, Giảm giá voucher, Phí vận chuyển tạm tính, **Tổng thanh toán**.
    - Nút lớn: **Tiến hành đặt hàng** (`/checkout`).

### 2.6. Trang Thanh Toán & Đặt Hàng (`/checkout`)

- **Thông tin nhận hàng:**
  - Họ và tên, Số điện thoại, Địa chỉ giao hàng chi tiết, Ghi chú giao hàng.
- **Phương thức thanh toán:**
  - [x] **Thanh toán khi nhận hàng (COD):** Không cần thanh toán trước.
  - [ ] **Chuyển khoản ngân hàng (Bank Transfer):** Tạo mã đơn, hiển thị mã VietQR động cùng số tài khoản và cú pháp chuyển khoản chính xác.
- **Nút "Hoàn tất đặt hàng":**
  - Tự động sinh `requestKey` chống bấm trùng (idempotency).
  - Điều hướng tới trang `/orders/[id]` kèm thông báo thành công.

### 2.7. Trang Đăng Nhập & Đăng Ký (Dark Mode Minimalist — Phong cách Samsung Account)

- **Giao diện:** Thẻ nổi bật ở chính giữa màn hình trên nền tối mờ (Dark Mode), tương phản cao, hiện đại.
- **Đăng nhập (`/login`):**
  - Tiêu đề: "Một tài khoản. Mọi thiết bị. Chỉ dành cho bạn."
  - Trường nhập Email / Tên đăng nhập.
  - Checkbox "Nhớ tài khoản".
  - Nút "Tiếp tục" / "Đăng nhập".
  - Nút đăng nhập nhanh (Google, QR Code mô phỏng).
  - Liên kết: "Tạo tài khoản mới" -> Chuyển sang `/register`.
- **Đăng ký (`/register`):**
  - Tiêu đề: "Tạo tài khoản của bạn".
  - Các trường: Email (kiểm tra định dạng, báo lỗi đỏ inline ngay lập tức), Mật khẩu (có icon ẩn/hiện mắt), Xác nhận mật khẩu, Họ và Tên, Số điện thoại.
  - Nút "Trở về" và "Hoàn tất đăng ký".

### 2.8. Footer Toàn Cục (Global Footer)

- Đa cột chuẩn công nghệ:
  - Cột 1: Mua Trực Tuyến (Trang chủ, Đổi mới, Ưu đãi).
  - Cột 2: Sản Phẩm (Điện thoại, Tablet, Laptop, Phụ kiện).
  - Cột 3: Hỗ Trợ Khách Hàng (Chính sách đổi trả, Bảo hành, Hướng dẫn mua hàng).
  - Cột 4: Tài Khoản (Đơn hàng của tôi, Giỏ hàng).
  - Cột 5: Giới Thiệu & Pháp Lý (Chứng nhận Bộ Công Thương, Bản quyền © 2026).

---

### 2.9. Giao Diện Quản Trị Admin (Seller Studio — Phong cách Tandem)

Phong cách thiết kế trang Admin được lấy cảm hứng từ nền tảng **Tandem Seller Studio**: Tông màu Xanh Rêu / Forest Green (`#1E3A2F` / `#2D6A4F`) kết hợp nền be/xám sáng thanh lịch (`#F8F9FA` / `#EDF2EE`), bo góc mềm mại, typography tinh tế, các thẻ tóm tắt số liệu trực quan và nút hành động nhanh.

#### 2.9.1. Top Navigation Bar Toàn Cục Cho Admin
- **Logo thương hiệu:** Logo cửa hàng + nhãn "Seller Studio".
- **Thanh menu tab chính trên đỉnh (Horizontal Tabs with Active Indicator):**
  - **Overview** (`/admin`): Tổng quan doanh thu và hoạt động cửa hàng trong ngày.
  - **Orders** (`/admin/orders`): Bàn giao vận và xử lý đơn hàng (kèm badge số đơn cần xử lý).
  - **Products** (`/admin/products`): Quản lý danh mục và danh sách sản phẩm.
  - **Inventory** (`/admin/inventory`): Quản lý tồn kho và cảnh báo nhập hàng.
  - **Promotions** (`/admin/promotions`): Quản lý mã giảm giá / voucher.
  - **Users** (`/admin/users`): Quản lý tài khoản khách hàng.
- **Góc phải:** Thông báo, Nút "+ Thêm sản phẩm" (+ Add a product) và Avatar tài khoản Quản trị viên.

#### 2.9.2. Trang Tổng Quan (Dashboard Overview — `/admin`)
- **Khối Hero Banner Xanh Rêu ("YOUR SHOP TODAY"):**
  - Nền màu Forest Green sâu lắng với đường cong hữu cơ tinh tế.
  - Tiêu đề chào mừng: *"A good day to grow. Keep orders moving and your best-loved products in stock."*
  - Nút CTA nhanh: *"Mở bàn xử lý đơn hàng ->"* (Open order desk).
  - Thống kê nổi bật 3 cột bên phải:
    - **Doanh thu cửa hàng** (Store sales): Doanh thu các đơn hợp lệ gần nhất.
    - **Đơn đang xử lý** (Orders in motion): Số lượng đơn đang chờ xác nhận hoặc chuẩn bị giao.
    - **Tổng số lượng hàng trong kho** (Units on hand): Số lượng thiết bị có sẵn.
- **Hàng Thẻ Chỉ Số Nhanh (Status Metric Cards):**
  - Card 1: **Đơn cần đóng gói** (Orders to prepare) — icon hộp hàng.
  - Card 2: **Sản phẩm đang bán** (Active listings) — icon danh mục.
  - Card 3: **Sắp hết hàng** (Low stock) — icon cảnh báo màu cam nhẹ.
  - Card 4: **Đã giao thành công** (Delivered) — icon hoàn thành màu xanh dịu.
- **Khu Vực Phân Tích & Hoạt Động (2 Cột):**
  - **Cột Trái — Doanh thu nhanh (Sales at a glance):**
    - Bộ chuyển đổi thời gian: [7 ngày gần nhất | 4 tuần gần đây] kết nối với API `GET /api/admin/stats/revenue?from=&to=`.
    - Hiển thị tổng doanh thu VND trong khoảng thời gian.
    - Biểu đồ cột (Bar Chart) tối giản với các cột màu xanh lá rêu biểu thị doanh thu từng ngày trong tuần.
  - **Cột Phải — Bàn đơn hàng hôm nay (Today's order desk):**
    - Danh sách các đơn mới phát sinh gần nhất.
    - Tên khách hàng, mã đơn, số lượng món.
    - Huy hiệu trạng thái màu pastel: `[Mới - New]`, `[Đang đóng gói - Packing]`, `[Sẵn sàng giao - Ready to ship]`.
    - Liên kết "Xem toàn bộ đơn hàng ->".

#### 2.9.3. Trang Quản Lý Sản Phẩm (Products Catalog — `/admin/products`)
- **Thẻ Thống Kê Đầu Trang (4 Chỉ số):**
  - Tổng số sản phẩm (All listings).
  - Đang mở bán (Active now).
  - Tổng giá trị sản phẩm theo niêm yết (Stock value).
  - Cảnh báo tồn kho dưới mức an toàn (Stock alerts).
- **Bảng Quản Lý Danh Mục & Sản Phẩm (Store Catalog):**
  - Thanh công cụ: Ô tìm kiếm đa năng (Tên sản phẩm, SKU, Danh mục), Dropdown lọc trạng thái (`Tất cả`, `Đang bán`, `Đã ẩn`), Dropdown sắp xếp (`Bán chạy nhất`, `Giá cao nhất`, `Mới nhất`).
  - Cột bảng:
    - **Sản phẩm:** Thumbnail ảnh, Tên sản phẩm, Danh mục / SKU.
    - **Giá:** Giá niêm yết VND.
    - **Tồn kho:** Số lượng + nhãn `In stock` / `Low stock`.
    - **Số lượng đã bán:** Thống kê số lượng bán ra.
    - **Trạng thái:** Huy hiệu tròn `● Đang bán (Active)` hoặc `● Đã ẩn (Hidden)`.
    - **Hành động:** Nút Xem chi tiết, Nút Sửa (mở Modal chỉnh sửa), Nút Ẩn/Hiện sản phẩm (`DELETE /api/products/:id` hoặc `PUT`).
- **Modal Thêm / Sửa Sản Phẩm:**
  - Kéo thả upload ảnh sản phẩm (gọi `POST /api/images`, lưu ID).
  - Nhập tên sản phẩm, hãng, danh mục (chọn từ danh sách danh mục).
  - Giá bán, số lượng kho, mô tả và bảng thông số kỹ thuật (Specs key-value).

#### 2.9.4. Trang Bàn Xử Lý Đơn Hàng (Fulfilment Desk — `/admin/orders`)
- **Thẻ Thống Kê Đơn Hàng Đầu Trang:**
  - Đơn đang mở (Open orders).
  - Đơn cần chuẩn bị hàng (To prepare).
  - Đơn đang trên đường giao hoặc đã giao (In transit / Delivered).
  - Tổng giá trị đơn đang chờ xử lý (Open order value).
- **Hàng Đợi Đơn Hàng (Order Queue Table):**
  - Tìm kiếm theo mã đơn hoặc tên/email khách hàng.
  - Bộ lọc trạng thái đơn: Tất cả, Chờ xác nhận (`pending`), Đang đóng gói (`confirmed`), Đang giao (`shipping`), Đã giao (`delivered`), Đã hủy (`cancelled`).
  - Cột bảng: Mã đơn, Thông tin người mua, Ngày đặt, Số lượng món, Tổng tiền VND, Trạng thái đơn, Trạng thái thanh toán (`unpaid` / `pending` / `paid`).
  - **Cột Thao Tác 1 Chạm (Next Step Action Button):**
    - Đơn `pending` → Nút `→ Xác nhận & Chuẩn bị đóng gói`.
    - Đơn `confirmed` → Nút `→ Xuất kho giao hàng`.
    - Đơn `shipping` → Nút `✓ Đã giao thành công`.
    - Đơn chuyển khoản ngân hàng đang `pending` thanh toán → Nút `✓ Xác nhận đã nhận tiền (Mark Paid)`.

#### 2.9.5. Trang Quản Lý Tồn Kho (Stockroom Inventory — `/admin/inventory`)
- **Hero Banner Kho Hàng:**
  - Tổng số lượng sản phẩm có sẵn trong kho (On hand right now).
  - Tổng giá trị hàng hóa đang lưu kho (Catalog value).
  - Số lượng mặt hàng chạm ngưỡng sắp hết hàng (Below stock point alerts).
- **Bảng Theo Dõi Mức Tồn Kho Chi Tiết:**
  - Tên mặt hàng & thumbnail.
  - Số lượng có sẵn: `0 (Hết hàng)`, `Thấp (Low stock)`, `Đủ hàng (In stock)`.
  - **Thanh đo trực quan (Stock Level Progress Bar):**
    - Màu đỏ/cam khi tồn kho thấp dưới ngưỡng (dưới 10 món).
    - Màu xanh lá cây đậm khi tồn kho dồi dào.
  - Ngưỡng cảnh báo hết hàng (Low-stock threshold).
  - Cụm nút điều chỉnh nhanh: `+ Nhập thêm hàng (+ Restock)` và `- Giảm tồn kho` (cập nhật tức thì vào DB).

#### 2.9.6. Trang Khuyến Mãi & Khách Hàng (`/admin/promotions`, `/admin/users`)
- Thống nhất cùng ngôn ngữ thiết kế: Thẻ chỉ số đầu trang, bảng dữ liệu thanh lịch, nút bật/tắt kích hoạt voucher, nút khóa/mở tài khoản khách hàng (`PATCH /api/admin/users/:id/status`).

---

## 3. Kiến Trúc Kỹ Thuật Frontend

- **Framework:** Next.js (App Router, JavaScript ESM).
- **Styling:** Tailwind CSS.
- **Hiệu ứng & Animation:**
  - `framer-motion` cho Mega-menu dropdown, Hero scroll shrink, và Scroll reveal.
  - Tailwind Transition cho hover effects, color swatches.
- **Tích hợp API:**
  - `next.config.js` cấu hình `rewrites` chuyển tiếp `/api/*` sang backend `http://localhost:4000/api/*` để giữ nguyên Same-Origin cho cookie JWT `token`.
  - Context State:
    - `AuthContext`: Quản lý phiên đăng nhập (`/api/auth/me`, login, register, logout).
    - `CartContext`: Quản lý giỏ hàng tức thời (thêm, sửa, xóa, tổng số lượng).
