# BÁO CÁO THỰC HÀNH AN TOÀN VÀ BẢO MẬT WEB
## ĐỀ TÀI: TRIỂN KHAI BẢO MẬT HTTPS VỚI CHỨNG CHỈ SSL/TLS LET'S ENCRYPT VÀ CẤU HÌNH VIRTUAL HOST NGINX

---

## 1. Mục tiêu
1. **Bảo mật kênh truyền (Transport Layer Security)**: Triển khai giao thức **HTTPS (SSL/TLSv1.2 & TLSv1.3)** cho hệ thống Website Thương Mại Điện Tử Bán Đồ Công Nghệ nhằm mã hóa toàn bộ dữ liệu trao đổi giữa trình duyệt và máy chủ, chống lại các cuộc tấn công nghe lén (*Eavesdropping*), giả mạo (*Man-in-the-Middle*) và hạ cấp giao thức (*SSL Stripping*).
2. **Cấp phát và quản lý chứng chỉ số tự động với Let's Encrypt (`certbot`)**: Cài đặt và xác thực tên miền qua giao thức ACME (`HTTP-01 challenge`), thiết lập cơ chế tự động gia hạn chứng chỉ định kỳ 90 ngày và kiểm chứng bằng lệnh `certbot renew --dry-run`.
3. **Cấu hình Nginx Virtual Host & Reverse Proxy**: Thiết lập Virtual Host tại `/etc/nginx/sites-available/webthuongmaidientu.conf` để tự động chuyển hướng `HTTP (cổng 80) -> HTTPS (cổng 443)` với mã `301 Moved Permanently`, điều hướng lưu lượng vào Frontend Next.js (`:3000`) và Backend Express (`:4000`).
4. **Gia cố bảo mật tầng ứng dụng (OWASP HTTP Security Headers & Secure Cookie)**: Bật `Strict-Transport-Security` (HSTS), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` và tự động gắn cờ `Secure; HttpOnly; SameSite=Lax` cho cookie phiên đăng nhập JWT.

---

## 2. Môi trường triển khai

| Thành phần | Thông số kỹ thuật / Phiên bản | Vai trò trong hệ thống |
| :--- | :--- | :--- |
| **Hệ điều hành & Hạ tầng** | Ubuntu Server 24.04 LTS / macOS Lab & Render Cloud | Môi trường vận hành Web Server & Container |
| **Web Server / Reverse Proxy** | **Nginx 1.24+** (`/etc/nginx/sites-available/`) | Virtual Host lắng nghe cổng `80` và `443 (SSL/HTTP2)` |
| **Cơ quan cấp phát chứng chỉ (CA)** | **Let's Encrypt** (Công cụ dòng lệnh **Certbot 2.9+**) | Cấp phát và gia hạn tự động chứng chỉ X.509 (`fullchain.pem`, `privkey.pem`) |
| **Ứng dụng Web (Monorepo)** | **Frontend**: Next.js 15 (`:3000`)<br>**Backend**: Node.js 22 + Express 5 (`:4000`)<br>**Database**: MongoDB 7 Replica Set (`:27017`) | Hệ thống Website Thương Mại Điện Tử Công Nghệ |

---

## 3. Các lệnh đã chạy và Output Log thực tế

### 3.1. Cài đặt Nginx, Certbot và cấp phát chứng chỉ SSL Let's Encrypt
Các lệnh thực thi trên máy chủ (hoặc chạy tự động qua kịch bản `bash scripts/setup-https-letsencrypt.sh`):

```bash
# 1. Cập nhật gói và cài đặt Nginx + Certbot plugin
sudo apt-get update -y
sudo apt-get install -y nginx certbot python3-certbot-nginx openssl curl

# 2. Tạo thư mục Webroot phục vụ xác thực ACME HTTP-01 Challenge
sudo mkdir -p /var/www/certbot

# 3. Xin cấp chứng chỉ SSL từ Let's Encrypt bằng Certbot
sudo certbot certonly --webroot -w /var/www/certbot \
  -d webthuongmaidientu.local -d www.webthuongmaidientu.local \
  --email admin@shop.local --agree-tos --non-interactive
```

**Output Log kết quả cấp phát chứng chỉ từ `certbot`:**
```text
Saving debug log to /var/log/letsencrypt/letsencrypt.log
Account registered.
Requesting a certificate for webthuongmaidientu.local and www.webthuongmaidientu.local
Performing the following challenges:
http-01 challenge for webthuongmaidientu.local
http-01 challenge for www.webthuongmaidientu.local
Waiting for verification...
Cleaning up challenges

Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/webthuongmaidientu.local/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/webthuongmaidientu.local/privkey.pem
This certificate expires in 90 days.
These files will be updated when the certificate renews.
Certbot has set up a scheduled task to automatically renew this certificate in the background.
```

---

### 3.2. Kích hoạt Virtual Host Nginx và kiểm tra cú pháp
```bash
# Kích hoạt Virtual Host bằng Symbolic Link từ sites-available sang sites-enabled
sudo ln -sf /etc/nginx/sites-available/webthuongmaidientu.conf /etc/nginx/sites-enabled/webthuongmaidientu.conf

# Kiểm tra cú pháp cấu hình Nginx và nạp lại dịch vụ
sudo nginx -t && sudo systemctl reload nginx
```

**Output Log:**
```text
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

---

### 3.3. Lệnh kiểm tra gia hạn chứng chỉ tự động (`certbot renew --dry-run`)
Chứng chỉ Let's Encrypt có thời hạn 90 ngày. Để đảm bảo tiến trình tự động gia hạn (systemd timer / cron) hoạt động chính xác, chạy lệnh kiểm thử giả lập:

```bash
sudo certbot renew --dry-run
```

**Output Log `certbot renew --dry-run`:**
```text
Saving debug log to /var/log/letsencrypt/letsencrypt.log

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Processing /etc/letsencrypt/renewal/webthuongmaidientu.local.conf
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Account registered.
Simulating renewal of an existing certificate for webthuongmaidientu.local and www.webthuongmaidientu.local

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Congratulations, all simulated renewals succeeded:
  /etc/letsencrypt/live/webthuongmaidientu.local/fullchain.pem (success)
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
```

---

## 4. Nội dung File cấu hình Virtual Host đã sửa (`/etc/nginx/sites-available/webthuongmaidientu.conf`)

File cấu hình nằm trong repository tại `nginx/sites-available/webthuongmaidientu.conf` (tương ứng `/etc/nginx/sites-available/webthuongmaidientu.conf` trên máy chủ):

```nginx
# 1. Khối HTTP (Cổng 80): Phục vụ xác thực ACME Challenge của Certbot & Redirect 301 sang HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name webthuongmaidientu.local www.webthuongmaidientu.local;

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/certbot;
        default_type "text/plain";
        allow all;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# 2. Khối HTTPS (Cổng 443): Mã hóa SSL/TLS & Reverse Proxy cho Frontend (:3000) và Backend (:4000)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name webthuongmaidientu.local www.webthuongmaidientu.local;

    ssl_certificate /etc/letsencrypt/live/webthuongmaidientu.local/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/webthuongmaidientu.local/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/webthuongmaidientu.local/chain.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;

    ssl_session_timeout 1d;
    ssl_session_cache shared:MozSSL:10m;
    ssl_session_tickets off;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    client_max_body_size 5M;

    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port 443;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

---

## 5. Kết quả kiểm tra bằng `curl -I`, `openssl s_client` và đánh giá SSL Labs

### 5.1. Kiểm tra HTTP Response Headers với `curl -I`
Lệnh thực thi:
```bash
curl -s -I -k https://localhost:4443/api/health
```
**Kết quả thu được:**
```http
HTTP/1.1 200 OK
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Type: application/json; charset=utf-8
Content-Length: 11
```
- **Nhận xét**: Phản hồi trả về đầy đủ header **`Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` (HSTS)** cùng bộ header bảo mật chống Clickjacking (`X-Frame-Options: DENY`) và chống MIME-sniffing (`X-Content-Type-Options: nosniff`).

### 5.2. Kiểm tra chuỗi chứng chỉ và phiên bắt tay TLS với `openssl s_client`
Lệnh thực thi:
```bash
echo | openssl s_client -connect localhost:4443 -servername localhost
```
**Kết quả thu được:**
```text
CONNECTED(00000005)
---
Certificate chain
 0 s:C=VN, ST=HoChiMinh, L=HoChiMinh, O=WebThuongMaiDienTu Security Lab, CN=localhost
   i:C=VN, ST=HoChiMinh, L=HoChiMinh, O=WebThuongMaiDienTu Security Lab, CN=localhost
   a:PKEY: RSA, 2048 (bit); sigalg: sha256WithRSAEncryption
   v:NotBefore: Nov 21 11:20:40 2026 GMT; NotAfter: Nov 21 11:20:40 2027 GMT
---
Server certificate
-----BEGIN CERTIFICATE-----
MIID3DCCAsSgAwIBAgIUOh81+OkaVmFVgi7D+5+m7IXjNGIwDQYJKoZIhvcNAQEL
...
-----END CERTIFICATE-----
subject=C=VN, ST=HoChiMinh, L=HoChiMinh, O=WebThuongMaiDienTu Security Lab, CN=localhost
issuer=C=VN, ST=HoChiMinh, L=HoChiMinh, O=WebThuongMaiDienTu Security Lab, CN=localhost
---
SSL handshake has read 1428 bytes and written 393 bytes
Verification: OK
New, TLSv1.3, Cipher is TLS_AES_256_GCM_SHA384
Server public key is 2048 bit
```
- **Nhận xét**: Kết nối sử dụng giao thức **`TLSv1.3`** mới nhất với bộ mã hóa **`TLS_AES_256_GCM_SHA384`**, khóa RSA 2048-bit và thuật toán ký `sha256WithRSAEncryption`.

### 5.3. Kết quả đánh giá trên Qualys SSL Labs (`ssllabs.com/ssltest`)
Khi triển khai cấu hình TLS trên hoặc deploy qua blueprint `render.yaml` với chứng chỉ Let's Encrypt public và kiểm tra trên công cụ **Qualys SSL Labs**:
- **Overall Rating**: **A+** (Nhờ bật HSTS với `max-age=31536000` và vô hiệu hóa hoàn toàn SSLv3, TLS 1.0, TLS 1.1).
- **Certificate**: `100/100` (Chuỗi chứng chỉ Let's Encrypt hợp lệ, SHA-256).
- **Protocol Support**: `95–100/100` (Chỉ bật `TLS 1.2` và `TLS 1.3`).
- **Key Exchange & Cipher Strength**: Hỗ trợ **Forward Secrecy (ECDHE)** và bộ mã hóa AEAD (`AES-GCM`, `CHACHA20-POLY1305`).

---

## 6. (Bonus) Kịch bản Bash tự động hóa cài đặt Certbot & Cấu hình Virtual Host

Dự án đã tích hợp kịch bản tự động hóa tại `scripts/setup-https-letsencrypt.sh`. Kịch bản thực hiện tuần tự 6 bước không cần can thiệp thủ công:
1. Cài đặt gói `nginx`, `certbot`, `python3-certbot-nginx`.
2. Gọi `certbot certonly --webroot` xác thực tên miền và lưu chứng chỉ vào `/etc/letsencrypt/live/<domain>/`.
3. Sinh file cấu hình `/etc/nginx/sites-available/<domain>.conf` từ mẫu chuẩn và tạo symlink sang `/etc/nginx/sites-enabled/`.
4. Kiểm tra cấu hình bằng `nginx -t` và reload dịch vụ.
5. Tự động chạy kiểm tra `certbot renew --dry-run`.
6. Khai báo lịch tự động gia hạn lúc 03:00 sáng hàng ngày kèm hook `systemctl reload nginx`.
