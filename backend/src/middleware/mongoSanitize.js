import mongoSanitize from 'express-mongo-sanitize';

/**
 * Express 5 compatible wrapper for express-mongo-sanitize.
 * Express 5 makes req.query a getter-only property, so reassigning req.query = ...
 * throws a TypeError. This middleware sanitizes req.query in place while safely
 * sanitizing req.body and req.params.
 */
export function express5MongoSanitize(options = {}) {
  return function (req, res, next) {
    if (req.body && typeof req.body === 'object') {
      req.body = mongoSanitize.sanitize(req.body, options);
    }
    if (req.params && typeof req.params === 'object') {
      req.params = mongoSanitize.sanitize(req.params, options);
    }
    if (req.query && typeof req.query === 'object') {
      const sanitized = mongoSanitize.sanitize({ ...req.query }, options);
      Object.defineProperty(req, 'query', {
        value: sanitized,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }
    next();
  };
}
