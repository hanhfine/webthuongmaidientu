import { AppError } from '../lib/errors.js';

const HONEYPOT_FIELDS = ['website_url', 'hp_company', 'cc_promo_verify'];

const SCANNER_UA_REGEX =
  /\b(?:sqlmap|nikto|nmap|gobuster|dirbuster|wpscan|nuclei|acunetix|masscan|hydra|zgrab|ffuf|wfuzz|nessus|openvas|arachni)\b/i;

// Candidate 13-19 digit card sequences separated optionally by single space or hyphen
const CARD_CANDIDATE_REGEX = /(?<!\d)(?:\d[ -]?){12,18}\d(?!\d)/g;

// Known card network BIN prefixes (Visa, Mastercard, Amex, Discover, JCB) to avoid false positives on timestamps/IDs
const CARD_BIN_PREFIX_REGEX =
  /^(?:4\d{12}(?:\d{3})?(?:\d{3})?|5[1-5]\d{14}|2(?:22[1-9]|2[3-9]\d|[3-6]\d{2}|7[01]\d|720)\d{12}|3[47]\d{13}|6(?:011|5\d{2})\d{12}|35(?:2[89]|[3-8]\d)\d{12})$/;

const SECRET_LEAK_REGEX =
  /(?:mongodb\+srv:\/\/[^\s"']+|-----BEGIN\s+(?:RSA\s+|EC\s+)?PRIVATE\s+KEY-----|SEPAY_WEBHOOK_API_KEY\s*=|JWT_SECRET\s*=)/i;

export function isValidLuhn(digits) {
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number(digits[i]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

export function containsValidCreditCard(text) {
  if (typeof text !== 'string' || text.length < 13) return false;
  const matches = text.match(CARD_CANDIDATE_REGEX);
  if (!matches) return false;
  for (const raw of matches) {
    const digits = raw.replace(/[ -]/g, '');
    if (CARD_BIN_PREFIX_REGEX.test(digits) && isValidLuhn(digits)) {
      return true;
    }
  }
  return false;
}

export function containsSensitiveLeak(text) {
  if (typeof text !== 'string') return false;
  return containsValidCreditCard(text) || SECRET_LEAK_REGEX.test(text);
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function honeypotGuard({ tarpitMs = 0 } = {}) {
  return async function honeypotMiddleware(req, res, next) {
    if (req.body && typeof req.body === 'object') {
      for (const field of HONEYPOT_FIELDS) {
        const val = req.body[field];
        if (typeof val === 'string' && val.trim().length > 0) {
          if (tarpitMs > 0) await delay(tarpitMs);
          return next(new AppError(403, 'BOT_DETECTED', 'Yêu cầu bị từ chối bởi hệ thống bẫy bot (Honeypot)'));
        }
      }
    }
    return next();
  };
}

export function scannerTarpitGuard({ tarpitMs = 0 } = {}) {
  return async function scannerTarpitMiddleware(req, res, next) {
    const ua = req.headers?.['user-agent'] || '';
    if (typeof ua === 'string' && SCANNER_UA_REGEX.test(ua)) {
      if (tarpitMs > 0) await delay(tarpitMs);
      return next(new AppError(403, 'SCANNER_BLOCKED', 'Công cụ quét tự động bị chặn bởi lớp bảo vệ WAF'));
    }
    return next();
  };
}

export function creditCardDlpMiddleware(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = function guardedJson(body) {
    try {
      const serialized = JSON.stringify(body);
      if (containsSensitiveLeak(serialized)) {
        res.status(403);
        return originalJson({
          code: 'DLP_LEAKAGE_BLOCKED',
          message: 'Phản hồi bị chặn bởi chính sách chống lộ lọt dữ liệu nhạy cảm (DLP)',
        });
      }
    } catch {
      // Fall through if body is not serializable
    }
    return originalJson(body);
  };
  return next();
}

export function createRateLimiter({ windowMs = 60_000, max = 20, enabled = true } = {}) {
  const hits = new Map();

  return function rateLimitMiddleware(req, res, next) {
    if (!enabled) return next();
    const key = `${req.ip || 'unknown'}:${req.path}`;
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || now > entry.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      return next(new AppError(429, 'TOO_MANY_REQUESTS', 'Quá nhiều yêu cầu trong thời gian ngắn, vui lòng thử lại sau'));
    }
    return next();
  };
}
