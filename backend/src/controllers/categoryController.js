import * as service from '../services/categoryService.js';
import { categorySchema } from '../validators/category.js';

export const list = async (req, res) => res.json(await service.listActive());
export const listAll = async (req, res) => res.json(await service.listAll());
export const create = async (req, res) =>
  res.status(201).json(await service.create(categorySchema.parse(req.body)));
export const update = async (req, res) =>
  res.json(await service.update(req.params.id, categorySchema.partial().parse(req.body)));
export const remove = async (req, res) => {
  await service.archive(req.params.id);
  res.status(204).end();
};
