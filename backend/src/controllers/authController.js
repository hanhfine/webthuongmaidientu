import * as authService from '../services/authService.js';
import { registerSchema, loginSchema } from '../validators/auth.js';
import { config } from '../config.js';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: config.env === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export async function register(req, res) {
  const user = await authService.register(registerSchema.parse(req.body));
  res.status(201).json(user);
}

export async function login(req, res) {
  const { user, token } = await authService.login(loginSchema.parse(req.body));
  res.cookie('token', token, cookieOptions).json(user);
}

export function logout(req, res) {
  res.clearCookie('token', { ...cookieOptions, maxAge: undefined }).status(204).end();
}

export async function me(req, res) {
  res.json(await authService.getById(req.user.id));
}
