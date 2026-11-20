'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, AlertCircle, QrCode } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Vui lòng nhập địa chỉ email');
      return;
    }
    if (!password) {
      setError('Vui lòng nhập mật khẩu');
      return;
    }

    try {
      setLoading(true);
      await login(email.trim(), password);
      toast.success('Đăng nhập thành công!');
      router.push('/');
    } catch (err) {
      setError(err.message || 'Email hoặc mật khẩu không chính xác');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0d0e] text-white flex flex-col justify-between py-8 px-4 sm:px-6">
      {/* Top Header */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
        <Link href="/" className="text-lg font-bold tracking-tight text-white hover:text-neutral-300 transition-colors">
          TechStore <span className="text-neutral-400 font-normal">Account</span>
        </Link>
      </div>

      {/* Centered Modal Card */}
      <div className="w-full max-w-md mx-auto my-8">
        <div className="bg-[#191a1d] border border-neutral-800 rounded-3xl p-8 sm:p-10 shadow-2xl">
          {/* Headline */}
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2 leading-snug">
              Một tài khoản. Mọi thiết bị.
            </h1>
            <p className="text-sm font-semibold text-neutral-300">
              Chỉ dành cho bạn.
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Đăng nhập để bắt đầu trải nghiệm
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                Địa chỉ email
              </label>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-4 py-3 bg-[#24262b] border border-neutral-700/80 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-neutral-400">
                  Mật khẩu
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu của bạn"
                  className="w-full px-4 py-3 pr-11 bg-[#24262b] border border-neutral-700/80 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                  aria-label="Ẩn hiện mật khẩu"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center">
              <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-700 bg-[#24262b] text-blue-600 focus:ring-blue-500"
                />
                Nhớ ID của tôi
              </label>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-[#2860e0] hover:bg-blue-600 text-white text-sm font-bold tracking-wide transition-all shadow-lg shadow-blue-900/30 disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Tiếp'
              )}
            </button>
          </form>

          {/* Links: Find ID | Register */}
          <div className="flex items-center justify-center gap-4 text-xs text-neutral-400 mt-6 pt-4 border-t border-neutral-800">
            <span className="hover:text-white transition-colors cursor-pointer">
              Tìm ID
            </span>
            <span className="text-neutral-600">•</span>
            <Link href="/register" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
              Tạo tài khoản
            </Link>
          </div>

          {/* Social Logins */}
          <div className="mt-6 space-y-2.5">
            <button
              type="button"
              onClick={() => toast.info('Đăng nhập Google hiện chỉ hỗ trợ trên môi trường SSO.')}
              className="w-full py-2.5 px-4 rounded-xl bg-[#2c2d32] hover:bg-[#35373d] text-xs font-semibold text-neutral-200 border border-neutral-700/60 flex items-center justify-center gap-2.5 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Đăng nhập bằng Google
            </button>

            <button
              type="button"
              onClick={() => toast.info('Tính năng quét mã QR đăng nhập qua điện thoại')}
              className="w-full py-2.5 px-4 rounded-xl bg-[#2c2d32] hover:bg-[#35373d] text-xs font-semibold text-neutral-200 border border-neutral-700/60 flex items-center justify-center gap-2.5 transition-colors"
            >
              <QrCode className="w-4 h-4 text-neutral-400" />
              Đăng nhập bằng mã QR
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto text-center text-[11px] text-neutral-500 space-y-2">
        <div className="flex flex-wrap justify-center gap-4">
          <span className="hover:text-neutral-400 cursor-pointer">Điều khoản và Điều kiện</span>
          <span>•</span>
          <span className="hover:text-neutral-400 cursor-pointer">Thông báo về quyền riêng tư</span>
          <span>•</span>
          <span className="hover:text-neutral-400 cursor-pointer">Thông báo</span>
          <span>•</span>
          <span className="hover:text-neutral-400 cursor-pointer">Liên hệ với chúng tôi</span>
        </div>
        <p>Copyright © 1995-2026 TechStore. All Rights Reserved.</p>
      </div>
    </div>
  );
}
