import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import routes from './routes/index.js';
import { config } from './config.js';
import { AppError } from './lib/errors.js';
import { errorHandler } from './middleware/errorHandler.js';
import { securityHeaders } from './middleware/security.js';
import { pathTraversalGuard } from './middleware/pathTraversalGuard.js';
import { express5MongoSanitize } from './middleware/mongoSanitize.js';

export function createApp({ forceHttps = config.forceHttps } = {}) {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // 1. Security Headers & HTTPS
  app.use(securityHeaders({ forceHttps }));
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hsts: false, // Managed conditionally by securityHeaders based on HTTPS
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
        },
      },
    }),
  );

  // 2. Body & Cookie Parsing
  app.use(express.json());
  app.use(cookieParser());

  // 3. Security Sanitize & Guard
  app.use(express5MongoSanitize());
  app.use(pathTraversalGuard);

  // 4. API Routes
  app.use('/api', routes);

  // 5. 404 & Global Error Handler
  app.use((req, res, next) => next(new AppError(404, 'NOT_FOUND', 'Không tìm thấy')));
  app.use(errorHandler);

  return app;
}
