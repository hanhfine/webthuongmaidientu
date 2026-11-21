'use client';

import { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  Copy,
  Check,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  RotateCcw,
  Info,
} from 'lucide-react';
import { formatVND, formatDate } from '@/lib/format';
import { useToast } from '@/context/ToastContext';

function formatCountdown(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '00:00';
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, '0');
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

async function copyText(value) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  if (typeof document !== 'undefined') {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

export default function SepayPaymentBox({ order }) {
  const toast = useToast();
  const [copiedField, setCopiedField] = useState(null);
  const [qrLoadError, setQrLoadError] = useState(false);
  const [nowMs, setNowMs] = useState(null);
  const copyTimerRef = useRef(null);

  const isCancelled = order?.status === 'cancelled';
  const paymentStatus = order?.paymentStatus || 'pending';
  const bankInfo = order?.paymentInfo?.bank || null;
  const transferContent =
    order?.paymentInfo?.transferContent ||
    order?.orderCode ||
    (order?._id ? `DH${String(order._id).slice(-8).toUpperCase()}` : '');

  const expectedAmount =
    order?.paymentInfo?.expectedAmount ??
    order?.payment?.expectedAmount ??
    order?.total ??
    0;
  const paidAmount =
    order?.paymentInfo?.paidAmount ??
    order?.payment?.paidAmount ??
    order?.paidAmount ??
    0;
  const overpaidAmount =
    order?.paymentInfo?.overpaidAmount ??
    order?.payment?.overpaidAmount ??
    order?.overpaidAmount ??
    0;
  const totalReceivedAmount = paidAmount + overpaidAmount;
  const remainingAmount =
    order?.paymentInfo?.remainingAmount ??
    (paidAmount > 0 ? Math.max(0, expectedAmount - paidAmount) : order?.total ?? 0);

  const qrUrl = order?.paymentInfo?.qrUrl || '';
  const expiresAtRaw =
    (paymentStatus === 'partially_paid' && order?.payment?.partialGraceExpiresAt) ||
    order?.paymentInfo?.expiresAt ||
    order?.paymentExpiresAt ||
    order?.payment?.expiresAt ||
    null;

  const expiresAtMs = expiresAtRaw ? new Date(expiresAtRaw).getTime() : null;
  const hasValidExpiry = Boolean(expiresAtMs && Number.isFinite(expiresAtMs));
  const isWaitingPayment = !isCancelled && ['pending', 'partially_paid'].includes(paymentStatus);

  useEffect(() => {
    setQrLoadError(false);
  }, [qrUrl]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isWaitingPayment || !hasValidExpiry) {
      setNowMs(null);
      return;
    }
    setNowMs(Date.now());
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [isWaitingPayment, hasValidExpiry, expiresAtMs]);

  if (!order || order.paymentMethod !== 'bank') {
    return null;
  }

  const remainingMs =
    hasValidExpiry && nowMs !== null ? Math.max(0, expiresAtMs - nowMs) : null;
  const isExpired = remainingMs !== null && remainingMs <= 0;
  const isUrgent = remainingMs !== null && remainingMs > 0 && remainingMs <= 3 * 60 * 1000;

  const handleCopy = async (field, value, label) => {
    try {
      await copyText(String(value));
      setCopiedField(field);
      toast.success(`Đã sao chép ${label}`);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => {
        setCopiedField(null);
      }, 2000);
    } catch {
      toast.error('Không thể sao chép tự động, vui lòng sao chép thủ công');
    }
  };

  return (
    <div className="space-y-3">
      {/* Status banners */}
      {paymentStatus === 'partially_paid' && !isCancelled && (
        <div className="p-4 rounded-2xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 text-orange-900 dark:text-orange-200 space-y-1.5 text-xs">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />
            <span>Đã nhận thanh toán một phần</span>
          </div>
          <p className="leading-relaxed tabular-nums">
            Hệ thống đã ghi nhận <strong>{formatVND(paidAmount)}</strong> /{' '}
            <strong>{formatVND(expectedAmount)}</strong>. Vui lòng chuyển bổ sung đúng số tiền còn thiếu{' '}
            <strong className="text-orange-700 dark:text-orange-300">
              {formatVND(remainingAmount)}
            </strong>{' '}
            với cùng nội dung <code className="font-mono font-bold">{transferContent}</code> để hoàn tất đơn hàng.
          </p>
        </div>
      )}

      {paymentStatus === 'need_refund' && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-200 space-y-1.5 text-xs">
          <div className="flex items-center gap-2 font-bold">
            <RotateCcw className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>Đang chờ hoàn tiền</span>
          </div>
          <p className="leading-relaxed tabular-nums">
            Đơn hàng đã hủy hoặc quá hạn giữ chỗ (hoặc sản phẩm đã hết hàng khi giao dịch chuyển khoản tới muộn). Hệ thống đã ghi nhận tổng số tiền{' '}
            <strong>{formatVND(totalReceivedAmount)}</strong> và đã chuyển bộ phận CSKH xử lý hoàn tiền lại cho bạn.
          </p>
        </div>
      )}

      {paymentStatus === 'refunded' && (
        <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 text-indigo-900 dark:text-indigo-200 space-y-1.5 text-xs">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>Đã hoàn tiền xong</span>
          </div>
          <p className="leading-relaxed tabular-nums">
            Khoản thanh toán{' '}
            <strong>{formatVND(totalReceivedAmount)}</strong> đã được quản trị viên xác nhận hoàn lại.
            {order?.payment?.refundedAt ? ` (${formatDate(order.payment.refundedAt, true)})` : ''}
          </p>
          {order?.payment?.refundNote && (
            <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
              Ghi chú: {order.payment.refundNote}
            </p>
          )}
        </div>
      )}

      {paymentStatus === 'paid' && (
        <div className="space-y-2.5">
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200 space-y-1 text-xs">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Đã thanh toán thành công qua chuyển khoản</span>
            </div>
            <p className="tabular-nums text-emerald-800 dark:text-emerald-300">
              Số tiền đã xác nhận: <strong>{formatVND(paidAmount || expectedAmount)}</strong>
              {order?.payment?.paidAt ? ` • Lúc ${formatDate(order.payment.paidAt, true)}` : ''}
            </p>
          </div>

          {overpaidAmount > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 space-y-1 text-xs">
              <div className="flex items-center gap-2 font-bold">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Ghi nhận chuyển thừa tiền</span>
              </div>
              <p className="leading-relaxed tabular-nums">
                Bạn đã chuyển dư <strong>{formatVND(overpaidAmount)}</strong> so với giá trị đơn hàng. Bộ phận CSKH/Kế toán đã ghi nhận và sẽ liên hệ hoàn lại phần tiền thừa này.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Active SePay VietQR & transfer instructions */}
      {isWaitingPayment && (
        <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900 text-white space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
              <QrCode className="w-4 h-4 shrink-0" />
              <span>Chuyển khoản nhanh VietQR (SePay)</span>
            </div>

            {hasValidExpiry && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tabular-nums ${
                  isExpired
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : isUrgent
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                    : 'bg-white/10 text-amber-300 border border-white/10'
                }`}
              >
                <Clock className="w-3 h-3 shrink-0" />
                {nowMs === null
                  ? '--:--'
                  : isExpired
                  ? 'Hết hạn giữ chỗ'
                  : `Giữ chỗ: ${formatCountdown(remainingMs)}`}
              </span>
            )}
          </div>

          {isExpired && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-[11px] leading-relaxed">
              Thời gian giữ chỗ tồn kho đã hết. Nếu bạn vừa chuyển khoản xong, hệ thống vẫn sẽ kiểm tra giao dịch cuối cùng và tự động xử lý hoặc chuyển hoàn tiền nếu hết hàng.
            </div>
          )}

          {/* QR Code */}
          {qrUrl && !qrLoadError ? (
            <div className="flex flex-col items-center justify-center bg-white rounded-2xl p-4 text-neutral-900">
              <img
                src={qrUrl}
                alt={`Mã VietQR thanh toán đơn ${transferContent}`}
                onError={() => setQrLoadError(true)}
                className="w-48 h-48 sm:w-52 sm:h-52 object-contain rounded-lg"
              />
              <span className="text-[11px] font-semibold text-neutral-600 mt-2 text-center">
                Mở app ngân hàng bất kỳ và quét mã QR để điền sẵn số tiền & nội dung
              </span>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center text-xs text-neutral-300 space-y-1">
              <QrCode className="w-8 h-8 text-amber-400 mx-auto" />
              <p className="font-semibold text-white">Chuyển khoản theo thông tin bên dưới</p>
              <p className="text-[11px] text-neutral-400">
                Vui lòng nhập chính xác số tiền và nội dung chuyển khoản để hệ thống tự động xác nhận.
              </p>
            </div>
          )}

          {/* Bank Details + Copy Buttons */}
          <div className="space-y-2.5 text-xs">
            {bankInfo?.name && (
              <div className="flex items-center justify-between gap-2 py-1">
                <span className="text-neutral-400">Ngân hàng</span>
                <span className="font-bold text-white text-right">
                  {bankInfo.name}
                  {bankInfo.code ? ` (${bankInfo.code})` : ''}
                </span>
              </div>
            )}

            {bankInfo?.holder && (
              <div className="flex items-center justify-between gap-2 py-1">
                <span className="text-neutral-400">Chủ tài khoản</span>
                <span className="font-bold text-white uppercase text-right">{bankInfo.holder}</span>
              </div>
            )}

            {bankInfo?.account && (
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10">
                <div className="min-w-0">
                  <span className="text-[11px] text-neutral-400 block">Số tài khoản</span>
                  <span className="font-mono font-bold text-sm text-white tracking-wider">
                    {bankInfo.account}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('account', bankInfo.account, 'số tài khoản')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold text-white transition-colors shrink-0 cursor-pointer"
                >
                  {copiedField === 'account' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">Đã chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10">
              <div className="min-w-0">
                <span className="text-[11px] text-neutral-400 block">
                  {paymentStatus === 'partially_paid' ? 'Số tiền cần chuyển thêm' : 'Số tiền cần chuyển'}
                </span>
                <span className="font-black text-base text-sky-400 tabular-nums whitespace-nowrap">
                  {formatVND(remainingAmount)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy('amount', remainingAmount, 'số tiền')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold text-white transition-colors shrink-0 cursor-pointer"
              >
                {copiedField === 'amount' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-400/30">
              <div className="min-w-0">
                <span className="text-[11px] text-amber-200/80 block">
                  Nội dung chuyển khoản (Bắt buộc)
                </span>
                <span className="font-mono font-black text-sm text-amber-300 tracking-wide break-all">
                  {transferContent}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy('content', transferContent, 'nội dung chuyển khoản')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-[11px] font-bold text-amber-200 transition-colors shrink-0 cursor-pointer"
              >
                {copiedField === 'content' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span className="text-emerald-200">Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 text-[11px] text-neutral-400">
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin shrink-0" />
            <span>
              Đang chờ hệ thống SePay tự động xác nhận giao dịch — trạng thái sẽ cập nhật ngay khi tiền về.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
