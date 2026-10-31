import { SignJWT, jwtVerify } from 'jose';
import { config } from '../config.js';

const secret = () => new TextEncoder().encode(config.jwtSecret);

export const signToken = (user) =>
  new SignJWT({ role: user.role })
    .setSubject(String(user._id))
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret());

export async function verifyToken(token) {
  const { payload } = await jwtVerify(token, secret());
  return payload;
}
