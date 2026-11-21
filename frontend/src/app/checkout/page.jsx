'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  CreditCard, 
  Banknote, 
  ShieldCheck, 
  MapPin, 
  User, 
  Phone, 
  QrCode, 
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import OrderSummaryCard from '@/components/cart/OrderSummaryCard';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { formatVND } from '@/lib/format';
import api from '@/lib/api';

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { cart, refreshCart } = useCart();
  const toast = useToast();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [appliedPromo, setAppliedPromo] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Auto pre-fill from user profile
  useEffect(() => {
    if (user) {
      if (user.fullName) setFullName(user.fullName);
      if (user.phone) setPhone(user.phone);
    }
  }, [user]);

  const items = cart?.items || [];
  const subtotal = cart?.subtotal || 0;
  const shippingFee = 30000;
  const discount = appliedPromo?.discount || 0;
  const total = Math.max(0, subtotal - discount + shippingFee);

  // Generate dynamic VietQR transfer info
  const transferCode = `TECH_${(user?.id || 'DH').slice(-6).toUpperCase()}`;

  const handleCreateOrder = async () => {
    setError('');

    const SQLI_OR_XSS_DETECT = /['";<>\\]|--|\/\*|\*\//;
    const VN_PHONE_REGEX = /^(?:0|\+?84)[0-9]{9}$/;

    if (!fullName.trim() || fullName.trim().length < 2) {
      setError('Vui lòng nhập họ tên người nhận hàng (tối thiểu 2 ký tự)');
      return;
    }
    if (SQLI_OR_XSS_DETECT.test(fullName.trim())) {
      setError('Họ và tên chứa ký tự đặc biệt không hợp lệ');
      return;
    }
    if (!phone.trim() || !VN_PHONE_REGEX.test(phone.trim())) {
      setError('Vui lòng nhập số điện thoại hợp lệ (10 chữ số, ví dụ: 0912345678)');
      return;
    }
    if (!address.trim() || address.trim().length < 5) {
      setError('Vui lòng nhập địa chỉ giao hàng chi tiết (tối thiểu 5 ký tự)');
      return;
    }
    if (SQLI_OR_XSS_DETECT.test(address.trim())) {
      setError('Địa chỉ chứa ký tự đặc biệt không hợp lệ');
      return;
    }
    if (items.length === 0) {
      setError('Giỏ hàng của bạn đang trống');
      return;
    }

    try {
      setSubmitting(true);
      const requestKey = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const order = await api.post('/api/orders', {
        requestKey,
        paymentMethod,
        shippingAddress: {
          fullName: fullName.trim(),
          phone: phone.trim(),
          address: address.trim(),
        },
        promotionCode: appliedPromo?.code || undefined,
      });

      await refreshCart();
      toast.success('Đặt hàng thành công!');
      router.push(`/orders/${order._id}`);
    } catch (err) {
      setError(err.message || 'Không thể tạo đơn hàng. Vui lòng thử lại.');
      toast.error(err.message || 'Lỗi đặt hàng');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h2 className="text-xl font-bold mb-2">Vui lòng đăng nhập để thanh toán</h2>
        <Link href="/login" className="text-sm font-semibold text-brand-blue hover:underline">
          Đăng nhập ngay
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h2 className="text-xl font-bold mb-2">Giỏ hàng của bạn đang trống</h2>
        <Link href="/products" className="text-sm font-semibold text-brand-blue hover:underline">
          Xem sản phẩm để mua sắm
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">
            Thanh Toán & Đặt Hàng
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Xác nhận thông tin giao hàng và phương thức thanh toán
          </p>
        </div>

        <Link
          href="/cart"
          className="text-xs font-bold text-brand-blue hover:underline flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Quay lại giỏ hàng
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Delivery Form & Payment Choice (Cols 1-7) */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Recipient Information */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-5">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-brand-blue" />
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                1. Thông tin người nhận hàng
              </h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Họ và tên người nhận *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Nguyễn Văn A"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs sm:text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Số điện thoại liên hệ *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      placeholder="0912 345 678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs sm:text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
                  Địa chỉ giao hàng chi tiết *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Số nhà, tên đường, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs sm:text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </div>
            </div>
          </div>

          {/* 2. Payment Method Selector */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-5">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-brand-blue" />
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                2. Chọn phương thức thanh toán
              </h2>
            </div>

            <div className="space-y-3">
              {/* Option COD */}
              <label
                className={`flex items-start gap-3.5 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  paymentMethod === 'cod'
                    ? 'border-brand-blue bg-blue-50/50 dark:bg-blue-950/20'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  className="mt-1 text-brand-blue focus:ring-brand-blue"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-bold text-neutral-900 dark:text-white">
                      Thanh toán khi nhận hàng (COD)
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    Thanh toán trực tiếp bằng tiền mặt cho nhân viên giao hàng khi nhận máy.
                  </p>
                </div>
              </label>

              {/* Option Bank Transfer VietQR */}
              <label
                className={`flex items-start gap-3.5 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  paymentMethod === 'bank'
                    ? 'border-brand-blue bg-blue-50/50 dark:bg-blue-950/20'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="bank"
                  checked={paymentMethod === 'bank'}
                  onChange={() => setPaymentMethod('bank')}
                  className="mt-1 text-brand-blue focus:ring-brand-blue"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-brand-blue" />
                    <span className="text-sm font-bold text-neutral-900 dark:text-white">
                      Chuyển khoản ngân hàng qua VietQR (Khuyên dùng)
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    Quét mã QR qua app ngân hàng bất kỳ, xác thực tức thì và được miễn phí vận chuyển.
                  </p>
                </div>
              </label>
            </div>

            {/* VietQR Dynamic Preview Box */}
            {paymentMethod === 'bank' && (
              <div className="p-5 rounded-2xl bg-neutral-900 text-white space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    Thông tin chuyển khoản VietQR
                  </span>
                  <span className="text-[11px] text-neutral-400">MB Bank Quân Đội</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <p className="text-neutral-400">Số tài khoản:</p>
                    <p className="text-base font-black text-white font-mono tracking-wider">
                      9999 8888 6666
                    </p>
                    <p className="text-neutral-400 pt-1">Chủ tài khoản:</p>
                    <p className="font-bold text-white uppercase">CONG TY TECHSTORE VIET NAM</p>
                    <p className="text-neutral-400 pt-1">Số tiền thanh toán:</p>
                    <p className="text-sm font-black text-brand-blue">{formatVND(total)}</p>
                    <p className="text-neutral-400 pt-1">Cú pháp chuyển khoản:</p>
                    <p className="font-bold text-amber-300 font-mono bg-white/10 px-2.5 py-1 rounded-md w-fit">
                      {transferCode}
                    </p>
                  </div>

                  {/* Dynamic VietQR code placeholder/image */}
                  <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl text-neutral-900 text-center">
                    <QrCode className="w-28 h-28 text-neutral-900 mb-1" />
                    <span className="text-[10px] font-bold text-neutral-600">
                      Quét mã bằng app ngân hàng
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Sticky Summary & Place Order Button (Cols 8-12) */}
        <div className="lg:col-span-5">
          <OrderSummaryCard
            subtotal={subtotal}
            shippingFee={shippingFee}
            appliedPromo={appliedPromo}
            onApplyPromo={(promo) => setAppliedPromo(promo)}
            onRemovePromo={() => setAppliedPromo(null)}
            isCheckoutPage={true}
            onProceed={handleCreateOrder}
            proceedLoading={submitting}
          />
        </div>
      </div>
    </div>
  );
}
