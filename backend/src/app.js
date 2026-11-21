import express from 'express';
import cookieParser from 'cookie-parser';
import routes from './routes/index.js';
import { config } from './config.js';
import { AppError } from './lib/errors.js';
import { errorHandler } from './middleware/errorHandler.js';
import { securityHeaders } from './middleware/security.js';

export function createApp({ forceHttps = config.forceHttps } = {}) {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(securityHeaders({ forceHttps }));
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api', routes);
  app.use((req, res, next) => next(new AppError(404, 'NOT_FOUND', 'Không tìm thấy')));
  app.use(errorHandler);
  return app;
}
