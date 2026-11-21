'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Package,
  Clock,
  ArrowRight,
  ShoppingBag,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { formatVND, formatDate, getOrderStatus, getPaymentStatus, getPaymentMethodLabel } from '@/lib/format';
import api from '@/lib/api';

const ORDER_TABS = [
  { id: 'all', label: 'Tất cả đơn' },
  { id: 'pending', label: 'Chờ xác nhận' },
  { id: 'confirmed', label: 'Đang chuẩn bị' },
  { id: 'shipping', label: 'Đang giao' },
  { id: 'delivered', label: 'Đã giao' },
  { id: 'cancelled', label: 'Đã hủy' },
];

export default function OrdersPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    async function loadOrders() {
      if (authLoading || !user || isAdmin) return;
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        });
        if (activeTab !== 'all') params.set('status', activeTab);
        const data = await api.get(`/api/orders?${params.toString()}`);
        const orderList = Array.isArray(data) ? data : (data?.items || []);
        setOrders(orderList);
        setTotal(data?.total ?? orderList.length);
      } catch {
        setOrders([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, [authLoading, user, isAdmin, page, activeTab]);

  if (authLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center text-sm text-neutral-400">
        <div className="w-8 h-8 border-2 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        Đang tải danh sách đơn hàng...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h2 className="text-xl font-bold mb-2">Vui lòng đăng nhập để xem đơn hàng</h2>
        <Link href="/login" className="text-sm font-semibold text-brand-blue hover:underline">
          Đăng nhập ngay
        </Link>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold">Quản lý đơn hàng dành cho Quản trị viên</h2>
        <p className="text-xs text-neutral-500">
          Vui lòng sử dụng bàn xử lý đơn hàng trong Seller Studio để theo dõi toàn bộ đơn hàng của cửa hàng.
        </p>
        <Link href="/admin/orders" className="inline-block px-6 py-3 rounded-xl bg-neutral-900 text-white text-xs font-bold">
          Mở Quản lý Đơn hàng Admin
        </Link>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white mb-2">
          Đơn Hàng Của Tôi
        </h1>
        <p className="text-xs text-neutral-500">
          Theo dõi tiến độ vận chuyển và lịch sử mua sắm thiết bị công nghệ
        </p>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar mb-8 border-b border-neutral-200 dark:border-neutral-800">
        {ORDER_TABS.map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-colors shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-3xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
          ))}
        </div>
      ) : orders.length > 0 ? (
        <>
          <div className="space-y-4">
            {orders.map((order) => {
              const statusInfo = getOrderStatus(order.status);
              const paymentInfo = getPaymentStatus(order.paymentStatus);
              const totalItems = order.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;

              return (
                <div
                  key={order._id}
                  className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-brand-blue flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-neutral-900 dark:text-white uppercase font-mono">
                          #{order._id.slice(-8).toUpperCase()}
                        </span>
                        <p className="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5 tabular-nums">
                          <Clock className="w-3 h-3" />
                          Đặt ngày {formatDate(order.createdAt, true)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-inset ring-black/5 ${statusInfo.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                        {statusInfo.label}
                      </span>

                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset ring-black/5 ${paymentInfo.badge}`}>
                        {paymentInfo.label}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 py-1">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-4 text-xs">
                        <span className="text-neutral-800 dark:text-neutral-200 font-medium min-w-0 truncate">
                          {item.name} <span className="text-neutral-400">×{item.quantity}</span>
                        </span>
                        <span className="font-semibold text-neutral-900 dark:text-white shrink-0 tabular-nums whitespace-nowrap">
                          {formatVND(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="text-xs text-neutral-500">
                      <span>{getPaymentMethodLabel(order.paymentMethod)}</span>
                      <span className="mx-2">•</span>
                      <span className="tabular-nums">{totalItems} sản phẩm</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right tabular-nums">
                        <span className="text-xs text-neutral-400 block">Tổng thanh toán:</span>
                        <span className="text-base font-black text-brand-blue whitespace-nowrap">
                          {formatVND(order.total)}
                        </span>
                      </div>

                      <Link
                        href={`/orders/${order._id}`}
                        className="px-5 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold hover:bg-neutral-800 transition-colors flex items-center gap-1"
                      >
                        Chi Tiết <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t border-neutral-200 dark:border-neutral-800 mt-6 text-xs">
              <span className="text-neutral-500 tabular-nums">
                Trang {page} / {totalPages} • Tổng {total} đơn hàng
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3.5 py-2 rounded-xl border border-neutral-200 bg-white dark:bg-neutral-900 font-semibold disabled:opacity-40 cursor-pointer"
                >
                  ‹ Trước
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3.5 py-2 rounded-xl border border-neutral-200 bg-white dark:bg-neutral-900 font-semibold disabled:opacity-40 cursor-pointer"
                >
                  Sau ›
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
          <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-4 text-neutral-400">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-white mb-1">
            Không có đơn hàng nào
          </h2>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto mb-6 text-pretty">
            Bạn chưa có đơn hàng nào trong mục này. Hãy tiếp tục mua sắm các thiết bị công nghệ hấp dẫn.
          </p>
          <Link
            href="/products"
            className="inline-block px-6 py-2.5 rounded-full bg-brand-blue text-white text-xs font-bold hover:bg-brand-blue-hover transition-colors"
          >
            Mua sắm ngay
          </Link>
        </div>
      )}
    </div>
  );
}
