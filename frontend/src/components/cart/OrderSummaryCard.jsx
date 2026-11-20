'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Tag, ShieldCheck, Check, X, ArrowRight } from 'lucide-react';
import { formatVND } from '@/lib/format';
import { useToast } from '@/context/ToastContext';
import api from '@/lib/api';

export default function OrderSummaryCard({
  subtotal = 0,
  shippingFee = 30000,
  appliedPromo = null,
  onApplyPromo = () => {},
  onRemovePromo = () => {},
  isCheckoutPage = false,
  onProceed = null,
  proceedLoading = false,
  disabled = false,
}) {
  const toast = useToast();
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [validating, setValidating] = useState(false);
  const [promoError, setPromoError] = useState('');

  const handleValidatePromo = async (e) => {
    e.preventDefault();
    setPromoError('');
    if (!promoCodeInput.trim()) return;

    try {
      setValidating(true);
      const res = await api.post('/api/promotions/validate', {
        code: promoCodeInput.trim(),
      });
      onApplyPromo({
        code: res.code,
        discount: res.discount,
      });
      toast.success(`Đã áp dụng mã giảm giá "${res.code}"!`);
      setPromoCodeInput('');
    } catch (err) {
      setPromoError(err.message || 'Mã giảm giá không hợp lệ hoặc đã hết lượt dùng');
      toast.error(err.message || 'Mã giảm giá không hợp lệ');
    } finally {
      setValidating(false);
    }
  };

  const discountAmount = appliedPromo?.discount || 0;
  const finalTotal = Math.max(0, subtotal - discountAmount + shippingFee);

  return (
    <div className="rounded-3xl p-6 sm:p-7 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-6 sticky top-24">
      <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
        Bản tóm tắt đơn hàng
      </h3>

      {/* Voucher Input Box */}
      {!appliedPromo ? (
        <form onSubmit={handleValidatePromo} className="space-y-2">
          <label className="block text-xs font-semibold text-neutral-500">
            Mã khuyến mãi / Voucher
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Nhập mã (VD: WELCOME10)"
                value={promoCodeInput}
                onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                className="w-full pl-9 pr-3 py-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-xs sm:text-sm font-semibold uppercase text-neutral-900 dark:text-white placeholder-neutral-400 border-none focus:ring-2 focus:ring-brand-blue"
              />
            </div>
            <button
              type="submit"
              disabled={validating || !promoCodeInput.trim()}
              className="px-5 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold hover:bg-neutral-800 transition-colors disabled:opacity-40"
            >
              {validating ? '...' : 'Áp dụng'}
            </button>
          </div>
          {promoError && (
            <p className="text-xs text-rose-600 animate-in fade-in">{promoError}</p>
          )}
        </form>
      ) : (
        /* Applied Promo Badge */
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
              <Check className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                Mã: {appliedPromo.code}
              </p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                Tiết kiệm {formatVND(discountAmount)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRemovePromo}
            className="p-1 rounded-lg hover:bg-emerald-100 text-emerald-700 transition-colors"
            title="Gỡ mã giảm giá"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Pricing Breakdown */}
      <div className="space-y-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs sm:text-sm">
        <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
          <span>Tổng tiền hàng:</span>
          <span className="font-semibold text-neutral-900 dark:text-white">
            {formatVND(subtotal)}
          </span>
        </div>

        {discountAmount > 0 && (
          <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
            <span>Giảm giá khuyến mãi:</span>
            <span className="font-bold">
              - {formatVND(discountAmount)}
            </span>
          </div>
        )}

        <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
          <span>Phí vận chuyển:</span>
          <span className="font-semibold text-neutral-900 dark:text-white">
            {formatVND(shippingFee)}
          </span>
        </div>

        <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex justify-between items-baseline">
          <div>
            <span className="text-base sm:text-lg font-black text-neutral-900 dark:text-white block">
              Tổng cộng:
            </span>
            <span className="text-[11px] text-neutral-400">Đã bao gồm VAT</span>
          </div>
          <span className="text-2xl font-black text-brand-blue">
            {formatVND(finalTotal)}
          </span>
        </div>
      </div>

      {/* CTA Button */}
      {!isCheckoutPage ? (
        <Link
          href={disabled ? '#' : '/checkout'}
          className={`w-full py-4 px-6 rounded-2xl bg-brand-blue hover:bg-brand-blue-hover text-white text-sm font-bold tracking-wide transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 ${
            disabled ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          Tiến Hành Thanh Toán
          <ArrowRight className="w-4 h-4" />
        </Link>
      ) : (
        <button
          type="button"
          disabled={proceedLoading || disabled}
          onClick={onProceed}
          className="w-full py-4 px-6 rounded-2xl bg-brand-blue hover:bg-brand-blue-hover text-white text-sm font-bold tracking-wide transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {proceedLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              Xác Nhận Đặt Hàng
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      )}

      {/* Store Warranty Perks */}
      <div className="flex items-center gap-2.5 pt-2 text-[11px] text-neutral-500">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>Đổi sản phẩm theo chính sách quy định trong vòng 15 ngày</span>
      </div>
    </div>
  );
}
