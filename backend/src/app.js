import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import routes from './routes/index.js';
import { AppError } from './lib/errors.js';
import { errorHandler } from './middleware/errorHandler.js';
import { pathTraversalGuard } from './middleware/pathTraversalGuard.js';
import { express5MongoSanitize } from './middleware/mongoSanitize.js';

export function createApp() {
  const app = express();

  // 1. Security HTTP Headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
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
