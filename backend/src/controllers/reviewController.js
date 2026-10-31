import * as service from '../services/reviewService.js';
import { reviewSchema, pageSchema } from '../validators/review.js';

export const list = async (req, res) =>
  res.json(await service.list(req.params.id, pageSchema.parse(req.query)));

export async function create(req, res) {
  const { review, created } = await service.upsert(req.user.id, req.params.id, reviewSchema.parse(req.body));
  res.status(created ? 201 : 200).json(review);
}
