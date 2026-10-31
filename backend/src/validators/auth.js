import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('Email không hợp lệ');

export const registerSchema = z.object({
  email,
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
  fullName: z.string().trim().min(1, 'Họ tên bắt buộc'),
  phone: z.string().trim().optional(),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Mật khẩu bắt buộc'),
});
