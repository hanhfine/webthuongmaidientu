import express from 'express';
import cookieParser from 'cookie-parser';
import routes from './routes/index.js';
import { AppError } from './lib/errors.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api', routes);
  app.use((req, res, next) => next(new AppError(404, 'NOT_FOUND', 'Không tìm thấy')));
  app.use(errorHandler);
  return app;
}
