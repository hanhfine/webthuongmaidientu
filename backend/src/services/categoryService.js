import { Category } from '../models/Category.js';
import { AppError, conflictIfDuplicate } from '../lib/errors.js';
import { slugify } from '../lib/slugify.js';
import { toObjectId } from '../lib/ids.js';

export const listActive = () => Category.find({ isActive: true }).sort('name').lean();
export const listAll = () => Category.find().sort('name').lean();

export async function create({ name }) {
  try {
    return await Category.create({ name, slug: slugify(name) });
  } catch (err) {
    throw conflictIfDuplicate(err, 'Danh mục đã tồn tại');
  }
}

export async function update(id, { name, isActive }) {
  const patch = {};
  if (name !== undefined) Object.assign(patch, { name, slug: slugify(name) });
  if (isActive !== undefined) patch.isActive = isActive;
  try {
    const cat = await Category.findByIdAndUpdate(toObjectId(id), patch, { returnDocument: 'after' });
    if (!cat) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy danh mục');
    return cat;
  } catch (err) {
    throw conflictIfDuplicate(err, 'Danh mục đã tồn tại');
  }
}

export async function archive(id) {
  await update(id, { isActive: false });
}
