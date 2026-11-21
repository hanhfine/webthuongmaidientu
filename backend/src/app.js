import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import mongoose from 'mongoose';
import routes from './routes/index.js';
import { config } from './config.js';
import { AppError } from './lib/errors.js';
import { errorHandler } from './middleware/errorHandler.js';
import { securityHeaders } from './middleware/security.js';
import { pathTraversalGuard } from './middleware/pathTraversalGuard.js';
import { express5MongoSanitize } from './middleware/mongoSanitize.js';
import {
  honeypotGuard,
  scannerTarpitGuard,
  creditCardDlpMiddleware,
  createRateLimiter,
} from './middleware/wafDefense.js';

export function createApp({
  forceHttps = config.forceHttps,
  enableRateLimit = config.env !== 'test',
  tarpitMs = config.env === 'test' ? 0 : 2000,
} = {}) {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // 1. Security Headers, HTTPS & Scanner Tarpit
  app.use(securityHeaders({ forceHttps }));
  app.use(scannerTarpitGuard({ tarpitMs }));
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

  // 3. Security Sanitize, Honeypot, DLP & Rate Limiting
  app.use(express5MongoSanitize());
  app.use(pathTraversalGuard);
  app.use(honeypotGuard({ tarpitMs }));
  app.use(creditCardDlpMiddleware);

  const authLimiter = createRateLimiter({ windowMs: 60_000, max: 15, enabled: enableRateLimit });
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use('/api/promotions/validate', authLimiter);

  // 4. Health & API Routes
  app.get('/health', (req, res) => {
    res.json({
      ok: true,
      status: 'ok',
      service: 'webthuongmaidientu-api',
      db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });
  app.use('/api', routes);

  // 5. 404 & Global Error Handler
  app.use((req, res, next) => next(new AppError(404, 'NOT_FOUND', 'Không tìm thấy')));
  app.use(errorHandler);

  return app;
}
