import { AppError } from '../lib/errors.js';

// Matches directory traversal patterns like ../, ..\, /.., \.., exactly .., %2e%2e, null-byte
const TRAVERSAL_PATTERN = /(?:\.\.[\\/]|[\\/]\.\.|^\.\.$|%2e%2e|\0|%00)/i;

// Matches attempts to read sensitive environment or system files
const SENSITIVE_PATTERN = /(?:(^|[\\/])\.env($|[\\/?#])|(^|[\\/])\.git($|[\\/?#])|etc[\\/](?:passwd|shadow|hosts)|proc[\\/]self|windows[\\/](?:win\.ini|system32))/i;

function isSuspicious(val) {
  if (typeof val === 'string') {
    let decoded = val;
    try {
      decoded = decodeURIComponent(val);
    } catch {
      return true; // Malformed percent-encoding is treated as suspicious
    }
    return TRAVERSAL_PATTERN.test(decoded) || SENSITIVE_PATTERN.test(decoded);
  }
  if (val && typeof val === 'object') {
    for (const key of Object.keys(val)) {
      if (isSuspicious(key) || isSuspicious(val[key])) {
        return true;
      }
    }
  }
  return false;
}

export function pathTraversalGuard(req, res, next) {
  // Check the request URI directly
  if (isSuspicious(req.originalUrl || req.url)) {
    return next(new AppError(400, 'MALICIOUS_REQUEST', 'Yêu cầu bị từ chối do vi phạm chính sách bảo mật'));
  }

  // Check query parameters
  if (req.query && isSuspicious(req.query)) {
    return next(new AppError(400, 'MALICIOUS_REQUEST', 'Yêu cầu bị từ chối do vi phạm chính sách bảo mật'));
  }

  // Check route parameters
  if (req.params && isSuspicious(req.params)) {
    return next(new AppError(400, 'MALICIOUS_REQUEST', 'Yêu cầu bị từ chối do vi phạm chính sách bảo mật'));
  }

  // Check request body
  if (req.body && isSuspicious(req.body)) {
    return next(new AppError(400, 'MALICIOUS_REQUEST', 'Yêu cầu bị từ chối do vi phạm chính sách bảo mật'));
  }

  next();
}
