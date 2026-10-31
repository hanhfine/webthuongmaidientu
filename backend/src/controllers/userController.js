import * as service from '../services/userService.js';
import { userListSchema, userStatusSchema } from '../validators/user.js';

export const list = async (req, res) => res.json(await service.list(userListSchema.parse(req.query)));
export const setStatus = async (req, res) => {
  const { isActive } = userStatusSchema.parse(req.body);
  res.json(await service.setStatus(req.user.id, req.params.id, isActive));
};
