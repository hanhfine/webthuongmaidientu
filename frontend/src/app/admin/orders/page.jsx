'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  ChevronDown,
  Check,
  Truck,
  CheckCircle2,
  ExternalLink,
  XCircle,
} from 'lucide-react';
import { formatVND, formatDate } from '@/lib/format';
import { useToast } from '@/context/ToastContext';
import api from '@/lib/api';

function AdminOrdersContent() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') || 'all';

  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [updatingId, setUpdatingId] = useState(null);

  const loadOrders = useCallback(async (targetPage = page, targetStatus = statusFilter) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(pageSize),
      });
      if (targetStatus !== 'all') params.set('status', targetStatus);
      const data = await api.get(`/api/admin/orders?${params.toString()}`);
      const orderList = Array.isArray(data) ? data : (data?.items || []);
      setOrders(orderList);
      setTotal(data?.total ?? orderList.length);
    } catch {
      toast.error('Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, toast]);

  useEffect(() => {
    loadOrders(page, statusFilter);
  }, [page, statusFilter, loadOrders]);

  const openOrders = orders.filter((o) => ['pending', 'confirmed', 'shipping'].includes(o.status));
  const toPrepareOrders = orders.filter((o) => ['pending', 'confirmed'].includes(o.status));
  const inTransitOrDelivered = orders.filter((o) => ['shipping', 'delivered'].includes(o.status));
  const openOrderValue = openOrders.reduce((sum, o) => sum + (o.total || 0), 0);

  const filteredOrders = orders.filter((o) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      o._id.toLowerCase().includes(q) ||
      (o.shippingAddress?.fullName && o.shippingAddress.fullName.toLowerCase().includes(q)) ||
      (o.shippingAddress?.phone && o.shippingAddress.phone.includes(q))
    );
  });

  const handleNextStep = async (order) => {
    let nextStatus = '';
    if (order.status === 'pending') nextStatus = 'confirmed';
    else if (order.status === 'confirmed') nextStatus = 'shipping';
    else if (order.status === 'shipping') nextStatus = 'delivered';
    if (!nextStatus) return;

    try {
      setUpdatingId(order._id);
      await api.patch(`/api/admin/orders/${order._id}/status`, { status: nextStatus });
      toast.success(`Đơn hàng #${order._id.slice(-8).toUpperCase()} đã chuyển sang "${nextStatus}"!`);
      loadOrders(page, statusFilter);
    } catch (err) {
      toast.error(err.message || 'Lỗi cập nhật trạng thái');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCancelOrder = async (order) => {
    try {
      setUpdatingId(order._id);
      await api.patch(`/api/admin/orders/${order._id}/status`, { status: 'cancelled' });
      toast.success(`Đã hủy đơn hàng #${order._id.slice(-8).toUpperCase()}!`);
      loadOrders(page, statusFilter);
    } catch (err) {
      toast.error(err.message || 'Không thể hủy đơn hàng');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleMarkPaid = async (orderId) => {
    try {
      setUpdatingId(orderId);
      await api.patch(`/api/admin/orders/${orderId}/payment`, { paymentStatus: 'paid' });
      toast.success(`Đã xác nhận thanh toán cho đơn hàng #${orderId.slice(-8).toUpperCase()}!`);
      loadOrders(page, statusFilter);
    } catch (err) {
      toast.error(err.message || 'Lỗi xác nhận thanh toán');
    } finally {
      setUpdatingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-8">
      <div>
        <span className="text-xs font-semibold text-admin-muted uppercase tracking-wider block mb-1">
          QUẢN LÝ ĐƠN HÀNG
        </span>
        <h1 className="text-3xl font-black text-brand-green tracking-tight">
          Đơn hàng
        </h1>
        <p className="text-xs sm:text-sm text-admin-muted mt-0.5">
          Theo dõi và xử lý từng đơn hàng từ bàn đóng gói cho tới tận cửa nhà khách hàng.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-admin-border">
          <p className="text-xs font-semibold text-admin-muted">Đơn đang mở (trang hiện tại)</p>
          <p className="text-2xl font-black text-brand-green mt-1 tabular-nums">{openOrders.length}</p>
          <p className="text-xs text-admin-muted mt-0.5">Cần tiếp tục xử lý</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-admin-border">
          <p className="text-xs font-semibold text-admin-muted">Cần chuẩn bị</p>
          <p className="text-2xl font-black text-amber-700 mt-1 tabular-nums">{toPrepareOrders.length}</p>
          <p className="text-xs text-amber-700 mt-0.5">Chờ duyệt / đóng gói</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-admin-border">
          <p className="text-xs font-semibold text-admin-muted">Đang giao / Đã giao</p>
          <p className="text-2xl font-black text-brand-green-light mt-1 tabular-nums">{inTransitOrDelivered.length}</p>
          <p className="text-xs text-brand-green-light mt-0.5">Đã bàn giao vận chuyển</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-admin-border min-w-0">
          <p className="text-xs font-semibold text-admin-muted">Giá trị đơn đang mở</p>
          <p className="text-xl sm:text-2xl font-black text-brand-green mt-1 truncate tabular-nums whitespace-nowrap">
            {formatVND(openOrderValue)}
          </p>
          <p className="text-xs text-admin-muted mt-0.5">Trên trang hiện tại</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-admin-border overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-admin-soft flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-admin-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm mã đơn, tên khách hoặc SĐT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-admin-bg border border-admin-border rounded-xl text-xs font-semibold text-brand-green placeholder:text-admin-muted focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="appearance-none pl-3.5 pr-8 py-2 bg-admin-bg border border-admin-border rounded-xl text-xs font-bold text-brand-green cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-green"
              >
                <option value="all">Tất cả đơn hàng ({total})</option>
                <option value="pending">Chờ xác nhận</option>
                <option value="confirmed">Đang đóng gói</option>
                <option value="shipping">Đang vận chuyển</option>
                <option value="delivered">Đã giao hoàn tất</option>
                <option value="cancelled">Đã hủy</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-admin-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-brand-green">
            <thead className="bg-admin-surface border-b border-admin-soft text-xs font-bold text-admin-muted uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6 whitespace-nowrap">Mã đơn</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Khách hàng</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Ngày đặt</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Số lượng</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Tổng tiền</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Trạng thái</th>
                <th className="py-3.5 px-6 text-right whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-soft">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-admin-muted">
                    Đang tải hàng đợi đơn hàng...
                  </td>
                </tr>
              ) : filteredOrders.length > 0 ? (
                filteredOrders.map((o) => {
                  const isUpdating = updatingId === o._id;
                  const canMarkPaid = o.paymentStatus !== 'paid' && o.status !== 'cancelled';
                  const isBankUnpaid = o.paymentMethod === 'bank' && o.paymentStatus !== 'paid';
                  const canAdminCancel = ['pending', 'confirmed'].includes(o.status) && o.paymentStatus !== 'paid';

                  return (
                    <tr key={o._id} className="hover:bg-admin-surface transition-colors">
                      <td className="py-4 px-6 font-mono font-bold text-sm">
                        <Link href={`/orders/${o._id}`} className="py-1.5 min-h-8 hover:underline inline-flex items-center gap-1 whitespace-nowrap">
                          #{o._id.slice(-8).toUpperCase()}
                          <ExternalLink className="w-3 h-3 text-admin-muted" />
                        </Link>
                        <span className="text-xs text-admin-muted font-sans font-normal block whitespace-nowrap">
                          Đơn trực tuyến
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <p className="font-bold text-sm text-brand-green">
                          {o.shippingAddress?.fullName || 'Khách hàng'}
                        </p>
                        <p className="text-xs text-admin-muted tabular-nums">
                          {o.shippingAddress?.phone}
                        </p>
                      </td>

                      <td className="py-4 px-4 text-admin-muted tabular-nums whitespace-nowrap">
                        {formatDate(o.createdAt)}
                      </td>

                      <td className="py-4 px-4 font-semibold tabular-nums whitespace-nowrap">
                        {o.items?.length || 1} món
                      </td>

                      <td className="py-4 px-4 font-black text-sm tabular-nums whitespace-nowrap">
                        {formatVND(o.total)}
                      </td>

                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ring-1 ring-inset ring-black/5 ${
                            o.status === 'pending'
                              ? 'bg-amber-50 text-amber-700'
                              : o.status === 'confirmed'
                              ? 'bg-blue-50 text-blue-700'
                              : o.status === 'shipping'
                              ? 'bg-zinc-100 text-zinc-700'
                              : o.status === 'delivered'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-red-50 text-red-700'
                          }`}>
                            <span className="size-1.5 rounded-full bg-current" />
                            {o.status === 'pending'
                              ? 'Chờ duyệt'
                              : o.status === 'confirmed'
                              ? 'Đang đóng gói'
                              : o.status === 'shipping'
                              ? 'Đang giao'
                              : o.status === 'delivered'
                              ? 'Đã giao'
                              : 'Đã hủy'}
                          </span>

                          <span className="block text-xs text-admin-muted whitespace-nowrap">
                            {o.paymentMethod.toUpperCase()} • {o.paymentStatus === 'paid' ? 'Đã thu tiền' : 'Chưa thu tiền'}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          {o.status === 'pending' && (
                            <button
                              type="button"
                              disabled={isUpdating || isBankUnpaid}
                              title={isBankUnpaid ? 'Cần xác nhận thanh toán chuyển khoản trước khi duyệt đơn' : ''}
                              onClick={() => handleNextStep(o)}
                              className="px-3.5 py-1.5 rounded-xl bg-brand-green hover:bg-brand-green-dark text-white text-xs font-bold transition-colors whitespace-nowrap disabled:opacity-40 cursor-pointer"
                            >
                              Duyệt & đóng gói
                            </button>
                          )}

                          {o.status === 'confirmed' && (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleNextStep(o)}
                              className="px-3.5 py-1.5 rounded-xl bg-brand-green hover:bg-brand-green-dark text-white text-xs font-bold transition-colors inline-flex items-center gap-1 whitespace-nowrap disabled:opacity-40 cursor-pointer"
                            >
                              <Truck className="w-3.5 h-3.5 shrink-0" /> Giao vận chuyển
                            </button>
                          )}

                          {o.status === 'shipping' && (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleNextStep(o)}
                              className="px-3.5 py-1.5 rounded-xl bg-brand-green-light hover:bg-brand-green text-white text-xs font-bold transition-colors inline-flex items-center gap-1 whitespace-nowrap disabled:opacity-40 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5 shrink-0" /> Hoàn tất giao
                            </button>
                          )}

                          {canMarkPaid && (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleMarkPaid(o._id)}
                              className="px-2.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ring-1 ring-inset ring-black/5"
                            >
                              ✓ Xác nhận đã thu
                            </button>
                          )}

                          {canAdminCancel && (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleCancelOrder(o)}
                              className="px-2.5 py-1 rounded-full bg-rose-500/10 hover:bg-rose-500/15 text-rose-700 text-xs font-bold transition-colors inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                            >
                              <XCircle className="w-3 h-3 shrink-0" /> Hủy đơn
                            </button>
                          )}

                          {o.status === 'delivered' && !canMarkPaid && (
                            <span className="text-xs font-bold text-brand-green-light flex items-center gap-1 whitespace-nowrap">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Hoàn tất
                            </span>
                          )}

                          {o.status === 'cancelled' && (
                            <span className="text-xs font-semibold text-red-700 whitespace-nowrap">
                              Đã hủy
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-admin-muted">
                    Không tìm thấy đơn hàng nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-admin-soft flex flex-wrap items-center justify-between gap-3 text-xs text-admin-muted">
            <span className="tabular-nums">
              Trang {page} / {totalPages} • Tổng {total} đơn hàng
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 min-h-8 rounded-lg border border-admin-border bg-white font-semibold hover:bg-admin-soft whitespace-nowrap shrink-0 disabled:opacity-40 cursor-pointer"
              >
                ‹ Trước
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 min-h-8 rounded-lg border border-admin-border bg-white font-semibold hover:bg-admin-soft whitespace-nowrap shrink-0 disabled:opacity-40 cursor-pointer"
              >
                Sau ›
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center text-xs text-admin-muted">
          Đang tải hàng đợi đơn hàng...
        </div>
      }
    >
      <AdminOrdersContent />
    </Suspense>
  );
}
