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
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');

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
      router.push('/');
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
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2 leading-snug">
              Tạo tài khoản TechStore của bạn
            </h1>
            <p className="text-xs text-neutral-400">
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
              <label className={`block text-xs font-medium mb-1.5 transition-colors ${
                showEmailError ? 'text-red-500 font-semibold' : 'text-neutral-400'
              }`}>
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (!emailTouched) setEmailTouched(true);
                }}
                onBlur={() => setEmailTouched(true)}
                placeholder="name@example.com"
                className={`w-full px-4 py-3 bg-[#24262b] border rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none transition-colors ${
                  showEmailError
                    ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500'
                    : 'border-neutral-700/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                }`}
              />
              {showEmailError && (
                <p className="text-[11px] text-red-500 mt-1.5 animate-in fade-in">
                  Địa chỉ email không hợp lệ.
                </p>
              )}
            </div>

            {/* 2. Password */}
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                Mật khẩu (tối thiểu 8 ký tự)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="w-full px-4 py-3 pr-11 bg-[#24262b] border border-neutral-700/80 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 3. Confirm Password */}
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                Xác nhận mật khẩu
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  className="w-full px-4 py-3 pr-11 bg-[#24262b] border border-neutral-700/80 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 4. Full Name (Họ & Tên) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                  Họ
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Nguyễn"
                  className="w-full px-4 py-3 bg-[#24262b] border border-neutral-700/80 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                  Tên
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Văn A"
                  className="w-full px-4 py-3 bg-[#24262b] border border-neutral-700/80 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* 5. Phone Number & Date of Birth */}
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                Số điện thoại (tùy chọn)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0912 345 678"
                className="w-full px-4 py-3 bg-[#24262b] border border-neutral-700/80 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Date of Birth (Ngày / Tháng / Năm) */}
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                Ngày sinh
              </label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={birthDay}
                  onChange={(e) => setBirthDay(e.target.value)}
                  placeholder="Ngày"
                  className="px-3 py-3 bg-[#24262b] border border-neutral-700/80 rounded-xl text-sm text-center text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
                <select
                  value={birthMonth}
                  onChange={(e) => setBirthMonth(e.target.value)}
                  className="px-3 py-3 bg-[#24262b] border border-neutral-700/80 rounded-xl text-sm text-center text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">Tháng</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Tháng {i + 1}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1940"
                  max="2026"
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  placeholder="Năm"
                  className="px-3 py-3 bg-[#24262b] border border-neutral-700/80 rounded-xl text-sm text-center text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Action Buttons: Trở về & Tiếp */}
            <div className="grid grid-cols-2 gap-3 pt-4">
              <Link
                href="/login"
                className="py-3.5 px-4 rounded-xl bg-[#45474f] hover:bg-[#52545d] text-white text-sm font-semibold tracking-wide transition-all text-center"
              >
                Trở về
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="py-3.5 px-4 rounded-xl bg-[#2860e0] hover:bg-blue-600 text-white text-sm font-bold tracking-wide transition-all shadow-lg shadow-blue-900/30 disabled:opacity-50 flex items-center justify-center"
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
      <div className="max-w-4xl mx-auto text-center text-[11px] text-neutral-500 space-y-2">
        <div className="flex flex-wrap justify-center gap-4">
          <span className="hover:text-neutral-400 cursor-pointer">Điều khoản và Điều kiện</span>
          <span>•</span>
          <span className="hover:text-neutral-400 cursor-pointer">Thông báo về quyền riêng tư</span>
          <span>•</span>
          <span className="hover:text-neutral-400 cursor-pointer">Liên hệ với chúng tôi</span>
        </div>
        <p>Copyright © 1995-2026 TechStore. All Rights Reserved.</p>
      </div>
    </div>
  );
}
