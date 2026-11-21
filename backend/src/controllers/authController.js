import * as authService from '../services/authService.js';
import { registerSchema, loginSchema } from '../validators/auth.js';
import { config } from '../config.js';
import { isHttpsRequest } from '../middleware/security.js';

export function cookieOptionsFor(req) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: Boolean(isHttpsRequest(req) || config.env === 'production'),
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

export async function register(req, res) {
  const { user, token } = await authService.register(registerSchema.parse(req.body));
  res.cookie('token', token, cookieOptionsFor(req)).status(201).json(user);
}

export async function login(req, res) {
  const { user, token } = await authService.login(loginSchema.parse(req.body));
  res.cookie('token', token, cookieOptionsFor(req)).json(user);
}

export function logout(req, res) {
  res.clearCookie('token', { ...cookieOptionsFor(req), maxAge: undefined }).status(204).end();
}

export async function me(req, res) {
  res.json(await authService.getById(req.user.id));
}
