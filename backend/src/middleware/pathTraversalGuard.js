import { AppError } from '../lib/errors.js';

// Matches directory traversal patterns like ../, ..\, /.., \.., exactly .., %2e%2e, null-byte
const TRAVERSAL_PATTERN = /(?:\.\.[\\/]|[\\/]\.\.|^\.\.$|%2e%2e|\0|%00)/i;

// Matches attempts to read sensitive environment or system files
const SENSITIVE_PATTERN = /(?:(^|[\\/])\.env($|[\\/?#])|(^|[\\/])\.git($|[\\/?#])|etc[\\/](?:passwd|shadow|hosts)|proc[\\/]self|windows[\\/](?:win\.ini|system32))/i;

function isSuspicious(val, { decodeUri = true } = {}) {
  if (typeof val === 'string') {
    let target = val;
    if (decodeUri) {
      try {
        target = decodeURIComponent(val);
      } catch {
        return true; // Malformed percent-encoding in URL/query/params is treated as suspicious
      }
    }
    return TRAVERSAL_PATTERN.test(target) || SENSITIVE_PATTERN.test(target);
  }
  if (val && typeof val === 'object') {
    for (const key of Object.keys(val)) {
      if (isSuspicious(key, { decodeUri }) || isSuspicious(val[key], { decodeUri })) {
        return true;
      }
    }
  }
  return false;
}

export function pathTraversalGuard(req, res, next) {
  // Check the request URI directly
  if (isSuspicious(req.originalUrl || req.url, { decodeUri: true })) {
    return next(new AppError(400, 'MALICIOUS_REQUEST', 'Yêu cầu bị từ chối do vi phạm chính sách bảo mật'));
  }

  // Check query parameters
  if (req.query && isSuspicious(req.query, { decodeUri: true })) {
    return next(new AppError(400, 'MALICIOUS_REQUEST', 'Yêu cầu bị từ chối do vi phạm chính sách bảo mật'));
  }

  // Check route parameters
  if (req.params && isSuspicious(req.params, { decodeUri: true })) {
    return next(new AppError(400, 'MALICIOUS_REQUEST', 'Yêu cầu bị từ chối do vi phạm chính sách bảo mật'));
  }

  // Check JSON request body without URI-decoding (literal '%' in reviews/descriptions is valid),
  // and skip body traversal check on signed bank webhook payloads
  const isWebhook = (req.originalUrl || req.url || '').startsWith('/api/webhooks/');
  if (!isWebhook && req.body && isSuspicious(req.body, { decodeUri: false })) {
    return next(new AppError(400, 'MALICIOUS_REQUEST', 'Yêu cầu bị từ chối do vi phạm chính sách bảo mật'));
  }

  next();
}
