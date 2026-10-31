import multer from 'multer';
import * as service from '../services/imageService.js';

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
}).single('file');

export async function upload(req, res) {
  res.status(201).json(await service.create(req.file));
}

export async function show(req, res) {
  const img = await service.get(req.params.id);
  res.set({ 'Content-Type': img.contentType, 'Cache-Control': 'public, max-age=86400' });
  res.send(img.data);
}
