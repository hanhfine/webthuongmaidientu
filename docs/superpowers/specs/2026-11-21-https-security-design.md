# Thiết Kế Triển Khai Bảo Mật HTTPS (Let's Encrypt, Nginx Virtual Host & Render Cloud)

## 1. Mục tiêu & Ngữ cảnh (Intent & Why)
Dự án web thương mại điện tử bán đồ công nghệ (`backend/` Express 5 + `frontend/` Next.js 15) cần triển khai bảo mật HTTPS nhằm đáp ứng đồng thời hai mục tiêu:
1. **Đáp ứng 100% yêu cầu bài thực hành môn An toàn và Bảo mật Web**:
   - Cài đặt SSL bằng **Let's Encrypt (`certbot`)** hoặc dịch vụ tương tự.
   - Cấu hình **Virtual Host với HTTPS** (`/etc/nginx/sites-available/webthuongmaidientu.conf`).
   - Có đầy đủ lệnh kiểm tra và log kết quả thực tế: `certbot`, `certbot renew --dry-run`, `openssl s_client`, `curl -I`, và kết quả đánh giá **SSL Labs**.
   - **(Bonus)** Kịch bản Bash tự động hóa cài đặt chứng chỉ và cấu hình Virtual Host (`scripts/setup-https-letsencrypt.sh`).
   - Báo cáo hoàn chỉnh (2–4 trang) tổng hợp toàn bộ quy trình và minh chứng.
2. **Triển khai thực tế & Demo nhanh (Local HTTPS + Render Cloud)**:
   - Chạy được HTTPS ngay trên máy local và qua Docker Nginx Reverse Proxy.
   - Có cấu hình `render.yaml` để deploy nhanh lên Render với chứng chỉ Let's Encrypt public phục vụ quét điểm A/A+ trên Qualys SSL Labs.

## 2. Goals, Non-Goals & Anti-Goals
- **Goals**:
  - Nâng cấp Backend Express nhận diện HTTPS qua Reverse Proxy (`trust proxy`), tự động bật cờ `Secure` cho `httpOnly` JWT cookie khi kết nối qua HTTPS, bổ sung HTTP Security Headers (HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) và tùy chọn ép chuyển hướng `FORCE_HTTPS`.
  - Cung cấp file cấu hình Nginx Virtual Host chuẩn `/etc/nginx/sites-available/webthuongmaidientu.conf` (chuyển hướng cổng 80 → 443, hỗ trợ ACME challenge, TLSv1.2/TLSv1.3, HSTS, Reverse Proxy `/api` → `:4000` và `/` → `:3000`).
  - Viết kịch bản Bash tự động hóa `scripts/setup-https-letsencrypt.sh` (Bonus) và script tạo chứng chỉ local `scripts/generate-local-cert.sh`.
  - Cập nhật `frontend/next.config.mjs` đọc biến môi trường `BACKEND_URL` và tạo `render.yaml` để deploy lên Render.
  - Xuất báo cáo hoàn chỉnh (2–4 trang) định dạng Markdown và Word (`.docx`) kèm log kiểm chứng thực tế.
- **Non-Goals**:
  - Không thay đổi kiến trúc xác thực JWT cookie sang Bearer header.
- **Anti-Goals**:
  - Không được làm hỏng bất kỳ bài test nào trong bộ 87 bài test `supertest` hiện có khi chạy `npm test` (vốn chạy qua HTTP in-memory).

## 3. Các phương án đã cân nhắc (Approaches)
1. **Phương án A (Đã chọn): Kết hợp Nginx Virtual Host + Let's Encrypt Certbot + Bash Automation + Render Blueprint + Backend Security Hardening**
   - *Ưu điểm*: Đạt 100% tiêu chí chấm điểm của đề bài (kể cả phần Bonus Bash script), có môi trường Nginx thật để chạy `curl -I` / `openssl s_client`, đồng thời deploy được lên Render để quét SSL Labs trên Internet.
2. **Phương án B: Chỉ dùng HTTPS có sẵn của Render**
   - *Nhược điểm*: Không có file `/etc/nginx/sites-available/...`, không chạy được lệnh `certbot renew --dry-run`.
3. **Phương án C: Chỉ dùng `next dev --experimental-https` trên máy local**
   - *Nhược điểm*: Thiếu tầng Web Server Virtual Host (Nginx/Apache) và thiếu quy trình cấp phát/gia hạn của Certbot.

## 4. Thiết kế kỹ thuật chi tiết
1. **Backend Security (`backend/src/middleware/security.js`, `app.js`, `config.js`, `authController.js`, `server.js`)**:
   - `app.set('trust proxy', 1)` để Express đọc `X-Forwarded-Proto: https` từ Nginx và Render.
   - Middleware `securityHeaders`: Gắn `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`. Khi request là HTTPS (`req.secure` hoặc `x-forwarded-proto === 'https'`), gắn thêm `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`. Nếu `config.forceHttps === true` và request là HTTP (trừ `/api/health`), redirect `308` sang `https://`.
   - `authController.js`: Hàm `cookieOptionsFor(req)` đặt `secure: Boolean(req.secure || req.headers['x-forwarded-proto'] === 'https' || config.env === 'production')`.
   - `server.js`: Nếu có `SSL_KEY_PATH` và `SSL_CERT_PATH`, khởi chạy `https.createServer({ key, cert }, app)`, ngược lại chạy HTTP chuẩn.
2. **Nginx Virtual Host (`nginx/sites-available/webthuongmaidientu.conf`)**:
   - Khối `server` cổng `80`: Phục vụ `/.well-known/acme-challenge/` tại `/var/www/certbot` và chuyển hướng toàn bộ request còn lại bằng `return 301 https://$host$request_uri;`.
   - Khối `server` cổng `443 ssl`: Khai báo `ssl_certificate /etc/letsencrypt/live/webthuongmaidientu.local/fullchain.pem;`, `ssl_certificate_key /etc/letsencrypt/live/webthuongmaidientu.local/privkey.pem;`, `ssl_protocols TLSv1.2 TLSv1.3;`, header HSTS, và `proxy_pass` cho `/api/` (tới cổng 4000) cùng `/` (tới cổng 3000).
3. **Kịch bản Bash Tự Động Hóa (`scripts/setup-https-letsencrypt.sh`)**:
   - Nhận tham số `<domain>` và `<email>` (mặc định hỗ trợ cả chế độ Production Let's Encrypt trên Ubuntu/Debian lẫn chế độ `--local-sim` tạo cấu trúc `/etc/letsencrypt/live/<domain>/` và kiểm tra với Nginx).
   - Tự động cài đặt gói, copy file vào `/etc/nginx/sites-available/`, tạo symlink sang `/etc/nginx/sites-enabled/`, chạy `nginx -t`, gọi `certbot` và kiểm tra `certbot renew --dry-run`.
4. **Cấu hình Render (`render.yaml` & `frontend/next.config.mjs`)**:
   - `next.config.mjs` sử dụng `process.env.BACKEND_URL || 'http://localhost:4000'` cho rule rewrite `/api/:path*`.
   - `render.yaml` định nghĩa 2 dịch vụ web (`webthuongmaidientu-api` và `webthuongmaidientu-web`).
5. **Báo cáo môn học (`docs/BAO_CAO_TRIEN_KHAI_HTTPS.md` & `docs/BAO_CAO_TRIEN_KHAI_HTTPS.docx`)**:
   - Đầy đủ nội dung 2–4 trang theo đúng cấu trúc yêu cầu của đề bài.
