export function isHttpsRequest(req) {
  if (req.secure) return true;
  const protoHeader = req.headers?.['x-forwarded-proto'];
  if (typeof protoHeader === 'string') {
    const primaryProto = protoHeader.split(',')[0].trim().toLowerCase();
    if (primaryProto === 'https') return true;
  }
  return false;
}

export function securityHeaders({ forceHttps = false } = {}) {
  return (req, res, next) => {
    const isSecure = isHttpsRequest(req);

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    if (isSecure) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    if (forceHttps && !isSecure && req.path !== '/api/health') {
      const host = req.headers.host || 'localhost';
      return res.redirect(308, `https://${host}${req.originalUrl}`);
    }

    return next();
  };
}
