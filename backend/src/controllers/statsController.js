import * as service from '../services/statsService.js';
import { revenueQuerySchema } from '../validators/stats.js';

export const revenue = async (req, res) =>
  res.json(await service.revenue(revenueQuerySchema.parse(req.query)));
