FROM owasp/modsecurity-crs:nginx

# Default runtime configuration (Render automatically overrides PORT)
ENV PORT=8080 \
    PROXY=1 \
    FRONTEND_ORIGIN=https://webthuongmaidientu-web.onrender.com \
    BACKEND_ORIGIN=https://webthuongmaidientu-api.onrender.com \
    PARANOIA=1 \
    BLOCKING_PARANOIA=1 \
    ANOMALY_INBOUND=5 \
    ANOMALY_OUTBOUND=4 \
    MODSEC_RULE_ENGINE=On \
    MODSEC_REQ_BODY_ACCESS=On \
    MODSEC_RESP_BODY_ACCESS=On \
    MODSEC_RESP_BODY_MIMETYPE="text/plain text/html text/xml application/json" \
    MODSEC_AUDIT_ENGINE=RelevantOnly \
    MODSEC_AUDIT_LOG=/dev/stdout \
    MODSEC_AUDIT_LOG_FORMAT=JSON

# Custom OWASP CRS rules: Honeypot, Scanner Blocking, Safe Exclusions, and @verifyCC Response DLP
COPY rules/REQUEST-900-EXCLUSION-RULES-BEFORE-CRS.conf /etc/modsecurity.d/owasp-crs/rules/REQUEST-900-EXCLUSION-RULES-BEFORE-CRS.conf
COPY rules/RESPONSE-999-EXCLUSION-RULES-AFTER-CRS.conf /etc/modsecurity.d/owasp-crs/rules/RESPONSE-999-EXCLUSION-RULES-AFTER-CRS.conf

# Custom Nginx Reverse Proxy template with Rate Limiting & Tarpit
COPY nginx/default.conf.template /etc/nginx/templates/conf.d/default.conf.template

EXPOSE 8080
