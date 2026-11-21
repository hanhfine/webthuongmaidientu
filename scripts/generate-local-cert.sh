#!/usr/bin/env bash
set -euo pipefail

CERT_DIR="$(cd "$(dirname "$0")/.." && pwd)/certs"
mkdir -p "${CERT_DIR}"

KEY_FILE="${CERT_DIR}/localhost-key.pem"
CERT_FILE="${CERT_DIR}/localhost.pem"

if command -v mkcert >/dev/null 2>&1; then
  echo "Generating locally-trusted TLS certificate using mkcert..."
  mkcert -install >/dev/null 2>&1 || true
  mkcert -key-file "${KEY_FILE}" -cert-file "${CERT_FILE}" localhost 127.0.0.1 ::1 webthuongmaidientu.local
else
  echo "Generating X.509 SAN TLS certificate using OpenSSL..."
  openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
    -keyout "${KEY_FILE}" \
    -out "${CERT_FILE}" \
    -subj "/C=VN/ST=HoChiMinh/L=HoChiMinh/O=WebThuongMaiDienTu Security Lab/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,DNS:webthuongmaidientu.local,IP:127.0.0.1"
fi

echo "Certificates generated:"
echo "  Cert: ${CERT_FILE}"
echo "  Key:  ${KEY_FILE}"
