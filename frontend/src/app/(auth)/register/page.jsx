'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');

  // Real-time email validation
  const isEmailValid = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  const showEmailError = emailTouched && email.length > 0 && !isEmailValid(email);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');

    if (!isEmailValid(email)) {
      setGeneralError('Vui lòng nhập địa chỉ email hợp lệ');
      return;
    }
    if (password.length < 8) {
      setGeneralError('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }
    if (password !== confirmPassword) {
      setGeneralError('Xác nhận mật khẩu không trùng khớp');
      return;
    }
    if (!firstName.trim()) {
      setGeneralError('Vui lòng nhập tên của bạn');
      return;
    }

    const fullName = `${lastName.trim()} ${firstName.trim()}`.trim();

    try {
      setLoading(true);
      await register({
        email: email.trim(),
        password,
        fullName,
        phone: phone.trim() || undefined,
      });
      toast.success('Đăng ký tài khoản thành công!');
      const rawRedirect = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('redirect') : null;
      const safeRedirect = rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : null;
      router.push(safeRedirect || '/');
    } catch (err) {
      setGeneralError(err.message || 'Không thể tạo tài khoản');
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
      <div className="w-full max-w-lg mx-auto my-8">
        <div className="bg-[#191a1d] border border-neutral-800 rounded-3xl p-8 sm:p-10 shadow-2xl">
          {/* Headline */}
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2 leading-snug text-balance">
              Tạo tài khoản TechStore của bạn
            </h1>
            <p className="text-xs text-neutral-300">
              Đăng ký nhanh chóng để nhận trọn bộ đặc quyền mua sắm và bảo hành VIP
            </p>
          </div>

          {/* General Error Banner */}
          {generalError && (
            <div className="mb-6 p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{generalError}</span>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 1. Email with real-time inline validation */}
            <div>
              <label
                htmlFor="reg-email"
                className={`block w-fit cursor-pointer text-xs font-medium mb-1.5 transition-colors ${
                  showEmailError ? 'text-red-400 font-semibold' : 'text-neutral-300'
                }`}
              >
                Email <span className="text-red-400">*</span>
              </label>
              <input
                id="reg-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (!emailTouched) setEmailTouched(true);
                }}
                onBlur={() => setEmailTouched(true)}
                placeholder="Nhập email của bạn"
                className={`w-full px-4 py-3 bg-[#24262b] border rounded-xl text-sm text-white placeholder:text-neutral-400 focus:outline-none transition-colors ${
                  showEmailError
                    ? 'border-red-500 focus:border-red-500 ring-2 ring-red-500/20'
                    : 'border-neutral-700/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                }`}
              />
              {showEmailError && (
                <p className="text-xs text-red-400 mt-1.5">
                  Địa chỉ email không hợp lệ.
                </p>
              )}
            </div>

            {/* 2. Password */}
            <div>
              <label htmlFor="reg-password" className="block w-fit cursor-pointer text-xs font-medium text-neutral-300 mb-1.5">
                Mật khẩu <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="w-full px-4 py-3 pr-11 bg-[#24262b] border border-neutral-700/80 rounded-xl text-sm text-white placeholder:text-neutral-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 inset-y-0 my-auto w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-white cursor-pointer"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-neutral-300 mt-1.5">Ít nhất 8 ký tự</p>
            </div>

            {/* 3. Confirm Password */}
            <div>
              <label htmlFor="reg-confirm-password" className="block w-fit cursor-pointer text-xs font-medium text-neutral-300 mb-1.5">
                Xác nhận mật khẩu <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  id="reg-confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  className="w-full px-4 py-3 pr-11 bg-[#24262b] border border-neutral-700/80 rounded-xl text-sm text-white placeholder:text-neutral-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-1 inset-y-0 my-auto w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-white cursor-pointer"
                  aria-label={showConfirmPassword ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 4. Full Name (Họ & Tên) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="reg-lastname" className="block w-fit cursor-pointer text-xs font-medium text-neutral-300 mb-1.5">
                  Họ
                </label>
                <input
                  id="reg-lastname"
                  name="familyName"
                  type="text"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Nguyễn"
                  className="w-full px-4 py-3 bg-[#24262b] border border-neutral-700/80 rounded-xl text-sm text-white placeholder:text-neutral-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                />
              </div>
              <div>
                <label htmlFor="reg-firstname" className="block w-fit cursor-pointer text-xs font-medium text-neutral-300 mb-1.5">
                  Tên <span className="text-red-400">*</span>
                </label>
                <input
                  id="reg-firstname"
                  name="givenName"
                  type="text"
                  autoComplete="given-name"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Văn A"
                  className="w-full px-4 py-3 bg-[#24262b] border border-neutral-700/80 rounded-xl text-sm text-white placeholder:text-neutral-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                />
              </div>
            </div>

            {/* 5. Phone Number */}
            <div>
              <label htmlFor="reg-phone" className="block w-fit cursor-pointer text-xs font-medium text-neutral-300 mb-1.5">
                Số điện thoại (tùy chọn)
              </label>
              <input
                id="reg-phone"
                name="tel"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0912 345 678"
                className="w-full px-4 py-3 bg-[#24262b] border border-neutral-700/80 rounded-xl text-sm text-white placeholder:text-neutral-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
              />
            </div>

            {/* Action Buttons: Trở về & Tiếp */}
            <div className="grid grid-cols-2 gap-3 pt-4">
              <Link
                href="/login"
                className="py-3.5 px-4 rounded-xl bg-[#45474f] hover:bg-[#52545d] text-white text-sm font-semibold tracking-wide transition-colors text-center"
              >
                Trở về
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="py-3.5 px-4 rounded-xl bg-brand-blue hover:bg-brand-blue-hover text-white text-sm font-bold tracking-wide transition-colors shadow-lg shadow-blue-900/30 disabled:opacity-50 flex items-center justify-center cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Tiếp'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto text-center text-xs text-neutral-400 space-y-2">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center gap-x-5 gap-y-2">
          <span className="hover:text-neutral-200 cursor-pointer whitespace-nowrap">Điều khoản và Điều kiện</span>
          <span className="hover:text-neutral-200 cursor-pointer whitespace-nowrap">Thông báo về quyền riêng tư</span>
          <span className="hover:text-neutral-200 cursor-pointer whitespace-nowrap">Thông báo</span>
          <span className="hover:text-neutral-200 cursor-pointer whitespace-nowrap">Liên hệ với chúng tôi</span>
        </div>
        <p>Copyright © 1995-2026 TechStore. All Rights Reserved.</p>
      </div>
    </div>
  );
}
