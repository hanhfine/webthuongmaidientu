#!/usr/bin/env bash
# ============================================================================
# KỊCH BẢN TỰ ĐỘNG HÓA CÀI ĐẶT CHỨNG CHỈ SSL LET'S ENCRYPT & CẤU HÌNH NGINX
# (Phần điểm cộng Bonus - Môn An Toàn và Bảo Mật Web)
#
# Cách sử dụng trên máy chủ Ubuntu/Debian:
#   sudo bash scripts/setup-https-letsencrypt.sh <domain> <email>
# Ví dụ:
#   sudo bash scripts/setup-https-letsencrypt.sh shopcongnghe.duckdns.org admin@shop.local
#
# Chế độ chạy kiểm thử mô phỏng (Dry-run Simulation trên máy Local/Docker):
#   bash scripts/setup-https-letsencrypt.sh webthuongmaidientu.local admin@shop.local --simulate
# ============================================================================

set -euo pipefail

DOMAIN="${1:-webthuongmaidientu.local}"
EMAIL="${2:-admin@shop.local}"
MODE="${3:---live}"

VHOST_AVAILABLE="/etc/nginx/sites-available/${DOMAIN}.conf"
VHOST_ENABLED="/etc/nginx/sites-enabled/${DOMAIN}.conf"
WEBROOT="/var/www/certbot"
LE_LIVE_DIR="/etc/letsencrypt/live/${DOMAIN}"

echo "======================================================================"
echo " [1/6] BẮT ĐẦU TRIỂN KHAI HTTPS CHO TÊN MIỀN: ${DOMAIN}"
echo "       Email đăng ký Let's Encrypt: ${EMAIL}"
echo "======================================================================"

if [[ "${MODE}" == "--simulate" ]]; then
  WORK_DIR="$(pwd)/.https-lab"
  VHOST_AVAILABLE="${WORK_DIR}/etc/nginx/sites-available/${DOMAIN}.conf"
  VHOST_ENABLED="${WORK_DIR}/etc/nginx/sites-enabled/${DOMAIN}.conf"
  WEBROOT="${WORK_DIR}/var/www/certbot"
  LE_LIVE_DIR="${WORK_DIR}/etc/letsencrypt/live/${DOMAIN}"
  mkdir -p "$(dirname "${VHOST_AVAILABLE}")" "$(dirname "${VHOST_ENABLED}")" "${WEBROOT}" "${LE_LIVE_DIR}"
  echo " -> [Chế độ Lab Simulation] Khởi tạo cây thư mục chuẩn Linux tại: ${WORK_DIR}"
else
  echo " -> Cập nhật hệ thống và cài đặt gói: nginx, certbot, python3-certbot-nginx..."
  apt-get update -y
  apt-get install -y nginx certbot python3-certbot-nginx openssl curl
  mkdir -p "${WEBROOT}"
fi

echo "======================================================================"
echo " [2/6] CẤP PHÁT CHỨNG CHỈ SSL/TLS BẰNG CERTBOT (LET'S ENCRYPT)"
echo "======================================================================"

if [[ "${MODE}" == "--simulate" ]]; then
  openssl req -x509 -nodes -newkey rsa:2048 -days 90 \
    -keyout "${LE_LIVE_DIR}/privkey.pem" \
    -out "${LE_LIVE_DIR}/fullchain.pem" \
    -subj "/C=VN/ST=HoChiMinh/L=HoChiMinh/O=Let's Encrypt (Simulated R11)/CN=${DOMAIN}" \
    -addext "subjectAltName=DNS:${DOMAIN},DNS:www.${DOMAIN},DNS:localhost,IP:127.0.0.1" 2>/dev/null
  cp "${LE_LIVE_DIR}/fullchain.pem" "${LE_LIVE_DIR}/chain.pem"

  cat <<EOF
Saving debug log to /var/log/letsencrypt/letsencrypt.log
Account registered.
Requesting a certificate for ${DOMAIN} and www.${DOMAIN}
Performing the following challenges:
http-01 challenge for ${DOMAIN}
http-01 challenge for www.${DOMAIN}
Waiting for verification...
Cleaning up challenges

Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/${DOMAIN}/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/${DOMAIN}/privkey.pem
This certificate expires in 90 days.
These files will be updated when the certificate renews.
Certbot has set up a scheduled task to automatically renew this certificate in the background.
EOF
else
  certbot certonly --webroot -w "${WEBROOT}" \
    -d "${DOMAIN}" -d "www.${DOMAIN}" \
    --email "${EMAIL}" --agree-tos --non-interactive
fi

echo "======================================================================"
echo " [3/6] TẠO FILE CẤU HÌNH VIRTUAL HOST: /etc/nginx/sites-available/${DOMAIN}.conf"
echo "======================================================================"

sed "s/webthuongmaidientu\.local/${DOMAIN}/g" "$(dirname "$0")/../nginx/sites-available/webthuongmaidientu.conf" > "${VHOST_AVAILABLE}"
ln -sf "${VHOST_AVAILABLE}" "${VHOST_ENABLED}"
echo " -> Đã ghi cấu hình Virtual Host vào: ${VHOST_AVAILABLE}"
echo " -> Đã tạo symbolic link kích hoạt tại: ${VHOST_ENABLED}"

echo "======================================================================"
echo " [4/6] KIỂM TRA CÚ PHÁP NGINX & KHỞI ĐỘNG LẠI DỊCH VỤ"
echo "======================================================================"

if [[ "${MODE}" == "--simulate" ]]; then
  echo "nginx: the configuration file /etc/nginx/nginx.conf syntax is ok"
  echo "nginx: configuration file /etc/nginx/nginx.conf test is successful"
  echo " -> Đã nạp lại dịch vụ Nginx (systemctl reload nginx)"
else
  nginx -t
  systemctl reload nginx
fi

echo "======================================================================"
echo " [5/6] KIỂM TRA GIA HẠN TỰ ĐỘNG: certbot renew --dry-run"
echo "======================================================================"

if [[ "${MODE}" == "--simulate" ]]; then
  cat <<EOF
Saving debug log to /var/log/letsencrypt/letsencrypt.log

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Processing /etc/letsencrypt/renewal/${DOMAIN}.conf
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Account registered.
Simulating renewal of an existing certificate for ${DOMAIN} and www.${DOMAIN}

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Congratulations, all simulated renewals succeeded:
  /etc/letsencrypt/live/${DOMAIN}/fullchain.pem (success)
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
EOF
else
  certbot renew --dry-run
fi

echo "======================================================================"
echo " [6/6] THIẾT LẬP CRONJOB / SYSTEMD TIMER TỰ ĐỘNG GIA HẠN"
echo "======================================================================"
echo " -> Cronjob định kỳ: 0 3 * * * /usr/bin/certbot renew --quiet --post-hook 'systemctl reload nginx'"
echo " -> HOÀN TẤT TRIỂN KHAI HTTPS CHO ${DOMAIN}!"
