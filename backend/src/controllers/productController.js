import * as service from '../services/productService.js';
import { productSchema, productPatchSchema, searchSchema } from '../validators/product.js';

export const list = async (req, res) => res.json(await service.search(searchSchema.parse(req.query)));
export const listAdmin = async (req, res) =>
  res.json(await service.search(searchSchema.parse(req.query), { includeInactive: true }));
export const show = async (req, res) => res.json(await service.getById(req.params.id));
export const brands = async (req, res) => res.json(await service.listBrands());
export const create = async (req, res) =>
  res.status(201).json(await service.create(productSchema.parse(req.body)));
export const update = async (req, res) =>
  res.json(await service.update(req.params.id, productPatchSchema.parse(req.body)));
export const remove = async (req, res) => {
  await service.archive(req.params.id);
  res.status(204).end();
};
