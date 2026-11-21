'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  Package,
  Clock,
  MapPin,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  XCircle,
  QrCode,
} from 'lucide-react';
import {
  formatVND,
  formatDate,
  getOrderStatus,
  getPaymentStatus,
  getPaymentMethodLabel,
} from '@/lib/format';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import api from '@/lib/api';

const TIMELINE_STEPS = [
  { key: 'pending', title: 'Đặt hàng thành công', desc: 'Đơn hàng đang chờ hệ thống duyệt' },
  { key: 'confirmed', title: 'Đã xác nhận & Đóng gói', desc: 'Sản phẩm đang được kiểm tra và đóng gói' },
  { key: 'shipping', title: 'Đang vận chuyển', desc: 'Đơn vị giao hàng đang trên đường tới' },
  { key: 'delivered', title: 'Giao hàng thành công', desc: 'Kiện hàng đã được bàn giao cho khách' },
];

export default function OrderDetailPage({ params }) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;
  const { user, isAdmin, loading: authLoading } = useAuth();
  const toast = useToast();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    async function loadOrder() {
      if (authLoading) return;
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const endpoint = isAdmin ? `/api/admin/orders/${orderId}` : `/api/orders/${orderId}`;
        const data = await api.get(endpoint);
        setOrder(data);
      } catch (err) {
        setOrder(null);
        toast.error(err.message || 'Không tìm thấy thông tin đơn hàng');
      } finally {
        setLoading(false);
      }
    }

    loadOrder();
  }, [orderId, user, isAdmin, authLoading, toast]);

  const handleCancelOrder = async () => {
    try {
      setCancelling(true);
      const updated = isAdmin
        ? await api.patch(`/api/admin/orders/${order._id}/status`, { status: 'cancelled' })
        : await api.post(`/api/orders/${order._id}/cancel`);
      setOrder(updated);
      setShowCancelModal(false);
      toast.success('Đơn hàng đã được hủy thành công!');
    } catch (err) {
      toast.error(err.message || 'Không thể hủy đơn hàng');
    } finally {
      setCancelling(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center text-sm text-neutral-400">
        <div className="w-8 h-8 border-2 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        Đang tải thông tin đơn hàng...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center space-y-2">
        <h2 className="text-xl font-bold">Vui lòng đăng nhập để xem chi tiết đơn hàng</h2>
        <Link href="/login" className="text-sm font-semibold text-brand-blue hover:underline">
          Đăng nhập ngay
        </Link>
      </div>
    );
  }

  const backHref = isAdmin ? '/admin/orders' : '/orders';

  if (!order) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h2 className="text-xl font-bold mb-2">Không tìm thấy đơn hàng</h2>
        <Link href={backHref} className="text-sm font-semibold text-brand-blue hover:underline">
          Xem danh sách đơn hàng
        </Link>
      </div>
    );
  }

  const isCancelled = order.status === 'cancelled';
  const statusInfo = getOrderStatus(order.status);
  const paymentInfo = getPaymentStatus(order.paymentStatus);
  const canCancel = ['pending', 'confirmed'].includes(order.status) && order.paymentStatus !== 'paid';

  const bankInfo = order.paymentInfo?.bank;
  const transferContent =
    order.paymentInfo?.transferContent || `DH${String(order._id).slice(-8).toUpperCase()}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">
              Chi Tiết Đơn Hàng
            </h1>
            <span className="font-mono text-sm font-bold bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-full text-neutral-700 dark:text-neutral-300">
              #{order._id.slice(-8).toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1 flex items-center gap-1.5 tabular-nums">
            <Clock className="w-3.5 h-3.5" />
            Thời gian đặt hàng: {formatDate(order.createdAt, true)}
          </p>
        </div>

        <Link
          href={backHref}
          className="text-xs font-bold text-brand-blue hover:underline flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {isAdmin ? 'Quay lại Quản lý đơn hàng' : 'Danh sách đơn hàng'}
        </Link>
      </div>

      {/* 1. Order Status Timeline Bar */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 mb-8">
        {isCancelled ? (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 flex items-center gap-3">
            <XCircle className="w-6 h-6 text-red-600 shrink-0" />
            <div>
              <p className="text-sm font-bold">Đơn hàng này đã bị hủy</p>
              <p className="text-xs text-red-700 mt-0.5 text-pretty">
                Các sản phẩm và số lượt sử dụng mã giảm giá (nếu có) đã được hoàn trả lại kho.
              </p>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                Tiến độ xử lý đơn hàng
              </h2>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-inset ring-black/5 ${statusInfo.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                {statusInfo.label}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 relative">
              {TIMELINE_STEPS.map((step, idx) => {
                const isPassed = statusInfo.step >= idx + 1;
                const isCurrent = statusInfo.step === idx + 1;

                return (
                  <div key={step.key} className="flex sm:flex-col items-start gap-3 sm:gap-2 relative z-10">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-colors ${
                        isPassed
                          ? 'bg-brand-blue text-white'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {isPassed ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                    </div>

                    <div>
                      <h4
                        className={`text-xs font-bold ${
                          isCurrent
                            ? 'text-brand-blue'
                            : isPassed
                            ? 'text-neutral-900 dark:text-white'
                            : 'text-neutral-400'
                        }`}
                      >
                        {step.title}
                      </h4>
                      <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug text-pretty">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2-Column Details Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 space-y-4">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-brand-blue" />
              Sản phẩm đã đặt ({order.items?.length || 0})
            </h2>

            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {order.items?.map((item, idx) => (
                <div key={idx} className="py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <Link
                      href={`/products/${item.productId}`}
                      className="text-sm font-bold text-neutral-900 dark:text-white hover:text-brand-blue transition-colors line-clamp-1"
                    >
                      {item.name}
                    </Link>
                    <p className="text-xs text-neutral-400 mt-0.5 tabular-nums">
                      Đơn giá: {formatVND(item.price)} × {item.quantity}
                    </p>
                  </div>

                  <span className="text-sm font-black text-neutral-900 dark:text-white shrink-0 tabular-nums whitespace-nowrap">
                    {formatVND(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-2.5 text-xs sm:text-sm tabular-nums">
              <div className="flex justify-between text-neutral-500">
                <span>Tiền hàng:</span>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200 whitespace-nowrap">
                  {formatVND(order.subtotal)}
                </span>
              </div>

              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Mã giảm giá ({order.promotionCode}):</span>
                  <span className="font-bold whitespace-nowrap">
                    - {formatVND(order.discount)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-neutral-500">
                <span>Phí giao hàng:</span>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200 whitespace-nowrap">
                  {formatVND(order.shippingFee)}
                </span>
              </div>

              <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex justify-between items-baseline">
                <span className="text-base font-bold text-neutral-900 dark:text-white">
                  Tổng tiền thanh toán:
                </span>
                <span className="text-2xl font-black text-brand-blue whitespace-nowrap">
                  {formatVND(order.total)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-brand-blue" />
              Địa chỉ nhận hàng
            </h3>
            <div>
              <p className="text-sm font-bold text-neutral-900 dark:text-white">
                {order.shippingAddress?.fullName}
              </p>
              <p className="text-xs text-neutral-500 mt-0.5 tabular-nums">
                {order.shippingAddress?.phone}
              </p>
              <p className="text-xs text-neutral-700 dark:text-neutral-300 mt-2 leading-relaxed text-pretty">
                {order.shippingAddress?.address}
              </p>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-brand-blue" />
              Thông tin thanh toán
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Hình thức:</span>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                  {getPaymentMethodLabel(order.paymentMethod)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Trạng thái:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset ring-black/5 ${paymentInfo.badge}`}>
                  {paymentInfo.label}
                </span>
              </div>
            </div>

            {order.paymentMethod === 'bank' && order.paymentStatus !== 'paid' && !isCancelled && bankInfo && (
              <div className="p-4 rounded-2xl bg-neutral-900 text-white space-y-2 text-xs">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <QrCode className="w-4 h-4" />
                  Hướng dẫn chuyển khoản ngân hàng
                </div>
                <p className="text-neutral-300">
                  Ngân hàng {bankInfo.name} • STK:{' '}
                  <span className="font-mono font-bold text-white">{bankInfo.account}</span>
                </p>
                <p className="text-neutral-300">Chủ TK: {bankInfo.holder}</p>
                <p className="text-neutral-300">
                  Nội dung:{' '}
                  <span className="font-mono font-bold text-amber-300 bg-white/10 px-2 py-0.5 rounded">
                    {transferContent}
                  </span>
                </p>
              </div>
            )}
          </div>

          {canCancel && (
            <div className="p-6 rounded-3xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 text-center space-y-3">
              <p className="text-xs text-rose-700 dark:text-rose-400 text-pretty">
                Có thể hủy đơn hàng này khi đơn chưa được thanh toán và chưa bàn giao cho đơn vị vận chuyển.
              </p>
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="w-full py-3 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/15 text-rose-700 dark:text-rose-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Hủy Đơn Hàng Này
              </button>
            </div>
          )}
        </div>
      </div>

      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 sm:p-8 max-w-sm w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Xác nhận hủy đơn hàng?
              </h3>
              <p className="text-sm/6 text-neutral-500 mt-2 text-pretty">
                Số lượng tồn kho và mã giảm giá (nếu có) sẽ được hoàn trả lại ngay lập tức.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={cancelling}
                onClick={() => setShowCancelModal(false)}
                className="py-2.5 px-4 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 cursor-pointer"
              >
                Không hủy
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleCancelOrder}
                className="py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
              >
                {cancelling ? 'Đang hủy...' : 'Đồng ý hủy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
