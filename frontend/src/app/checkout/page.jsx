'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CreditCard,
  Banknote,
  MapPin,
  User,
  Phone,
  QrCode,
  AlertCircle,
  ArrowLeft,
  ShoppingBag,
} from 'lucide-react';
import OrderSummaryCard from '@/components/cart/OrderSummaryCard';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { formatVND } from '@/lib/format';
import api from '@/lib/api';

const makeRequestKey = () =>
  `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const {
    cart,
    refreshCart,
    appliedPromo,
    applyPromo,
    removePromo,
    storeConfig,
  } = useCart();
  const toast = useToast();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const requestKeyRef = useRef(makeRequestKey());

  // Auto pre-fill from user profile
  useEffect(() => {
    if (user) {
      if (user.fullName) setFullName(user.fullName);
      if (user.phone) setPhone(user.phone);
    }
  }, [user]);

  const items = cart?.items || [];
  const subtotal = cart?.subtotal || 0;
  const shippingFee = storeConfig?.shippingFee ?? 30000;
  const discount = Math.min(appliedPromo?.discount || 0, subtotal);
  const total = subtotal - discount + shippingFee;
  const anyUnavailable = items.some((i) => !i.available);

  const cartSignature = `${items.map((i) => `${i.productId}:${i.quantity}`).join(',')}|${appliedPromo?.code || ''}|${paymentMethod}`;
  useEffect(() => {
    requestKeyRef.current = makeRequestKey();
  }, [cartSignature]);

  const handleCreateOrder = async () => {
    setError('');
    setFieldErrors({});

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
    if (anyUnavailable) {
      setError('Giỏ hàng có sản phẩm không khả dụng hoặc vượt quá tồn kho');
      return;
    }

    try {
      setSubmitting(true);
      const order = await api.post('/api/orders', {
        requestKey: requestKeyRef.current,
        paymentMethod,
        shippingAddress: {
          fullName: fullName.trim(),
          phone: phone.trim(),
          address: address.trim(),
        },
        promotionCode: appliedPromo?.code || undefined,
      });

      removePromo();
      requestKeyRef.current = makeRequestKey();
      await refreshCart();
      toast.success('Đặt hàng thành công!');
      router.push(`/orders/${order._id}`);
    } catch (err) {
      setError(err.message || 'Không thể tạo đơn hàng. Vui lòng thử lại.');
      if (err.fieldErrors) setFieldErrors(err.fieldErrors);
      toast.error(err.message || 'Lỗi đặt hàng');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center text-sm text-neutral-400">
        <div className="w-8 h-8 border-2 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        Đang tải thông tin thanh toán...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/60 text-brand-blue flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
          Đăng nhập để hoàn tất đặt hàng
        </h2>
        <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-sm mx-auto mb-6 text-pretty">
          Giỏ hàng của bạn được giữ nguyên và tự động đồng bộ ngay sau khi đăng nhập.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login?redirect=/checkout"
            className="inline-block px-8 py-3.5 rounded-full bg-brand-blue hover:bg-brand-blue-hover text-white text-xs font-bold transition-colors"
          >
            Đăng nhập ngay
          </Link>
          <Link
            href="/cart"
            className="inline-block px-6 py-3.5 rounded-full border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 text-xs font-bold transition-colors"
          >
            Quay lại giỏ hàng
          </Link>
        </div>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold">Tài khoản Quản trị viên không thể đặt hàng</h2>
        <Link href="/admin" className="inline-block px-6 py-3 rounded-xl bg-neutral-900 text-white text-xs font-bold">
          Về Trang Quản Trị
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
          Giỏ hàng của bạn đang trống
        </h2>
        <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-sm mx-auto mb-6 text-pretty">
          Chọn thêm thiết bị yêu thích vào giỏ hàng trước khi tiến hành thanh toán.
        </p>
        <Link
          href="/products"
          className="inline-block px-8 py-3.5 rounded-full bg-brand-blue hover:bg-brand-blue-hover text-white text-xs font-bold transition-colors"
        >
          Khám phá sản phẩm
        </Link>
      </div>
    );
  }

  const bank = storeConfig?.bank || {
    name: 'Vietcombank',
    account: '0123456789',
    holder: 'CUA HANG CONG NGHE',
  };

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
          {(error || anyUnavailable) && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">
                  {error || 'Có sản phẩm trong giỏ hàng đã hết hoặc vượt quá tồn kho. Vui lòng quay lại giỏ hàng để điều chỉnh.'}
                </p>
                {Object.keys(fieldErrors).length > 0 && (
                  <ul className="mt-1 list-disc list-inside space-y-0.5">
                    {Object.entries(fieldErrors).map(([k, msgs]) => (
                      <li key={k}>
                        {k}: {Array.isArray(msgs) ? msgs.join(', ') : String(msgs)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* 1. Recipient Information */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 space-y-5">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-brand-blue" />
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                1. Thông tin người nhận hàng
              </h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="checkout-fullName" className="block w-fit cursor-pointer text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Họ và tên người nhận <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="checkout-fullName"
                      name="fullName"
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
                  <label htmlFor="checkout-phone" className="block w-fit cursor-pointer text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Số điện thoại liên hệ <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="checkout-phone"
                      name="phone"
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
                <label htmlFor="checkout-address" className="block w-fit cursor-pointer text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
                  Địa chỉ giao hàng chi tiết <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="checkout-address"
                  name="address"
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
          <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 space-y-5">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-brand-blue" />
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                2. Chọn phương thức thanh toán
              </h2>
            </div>

            <div className="space-y-3">
              <label
                className={`flex items-start gap-3.5 p-4 rounded-2xl border-2 transition-colors cursor-pointer ${
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

              <label
                className={`flex items-start gap-3.5 p-4 rounded-2xl border-2 transition-colors cursor-pointer ${
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
                      Chuyển khoản ngân hàng (VietQR)
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    Chuyển khoản qua tài khoản ngân hàng cửa hàng; mã nội dung chuyển khoản được cấp ngay sau khi đặt đơn.
                  </p>
                </div>
              </label>
            </div>

            {paymentMethod === 'bank' && (
              <div className="p-5 rounded-2xl bg-neutral-900 text-white space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    Thông tin chuyển khoản ngân hàng
                  </span>
                  <span className="text-[11px] text-neutral-300 font-semibold">{bank.name}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <p className="text-neutral-400">Số tài khoản:</p>
                    <p className="text-base font-black text-white font-mono tracking-wider">
                      {bank.account}
                    </p>
                    <p className="text-neutral-400 pt-1">Chủ tài khoản:</p>
                    <p className="font-bold text-white uppercase">{bank.holder}</p>
                    <p className="text-neutral-400 pt-1">Số tiền thanh toán:</p>
                    <p className="text-sm font-black text-brand-blue tabular-nums">{formatVND(total)}</p>
                    <p className="text-neutral-400 pt-1">Nội dung chuyển khoản:</p>
                    <p className="font-mono text-amber-300 text-xs">
                      Hiển thị dạng <code className="font-bold">DH...</code> ngay sau khi bấm Đặt Hàng
                    </p>
                  </div>

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
            onApplyPromo={applyPromo}
            onRemovePromo={removePromo}
            isCheckoutPage={true}
            onProceed={handleCreateOrder}
            proceedLoading={submitting}
            disabled={anyUnavailable}
          />
        </div>
      </div>
    </div>
  );
}
