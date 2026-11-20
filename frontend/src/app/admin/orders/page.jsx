'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Package, 
  Search, 
  ChevronDown, 
  Check, 
  Truck, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { formatVND, formatDate } from '@/lib/format';
import { useToast } from '@/context/ToastContext';
import api from '@/lib/api';

export default function AdminOrdersPage() {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await api.get('/api/admin/orders');
      const orderList = Array.isArray(data) ? data : (data?.items || []);
      setOrders(orderList);
    } catch (err) {
      toast.error('Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // Compute 4 Top Summary Metrics (from Tandem Fulfilment Desk)
  const openOrders = orders.filter((o) => ['pending', 'confirmed', 'shipping'].includes(o.status));
  const toPrepareOrders = orders.filter((o) => ['pending', 'confirmed'].includes(o.status));
  const inTransitOrDelivered = orders.filter((o) => ['shipping', 'delivered'].includes(o.status));
  const openOrderValue = openOrders.reduce((sum, o) => sum + (o.total || 0), 0);

  // Filter & Search
  const filteredOrders = orders.filter((o) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      o._id.toLowerCase().includes(q) ||
      (o.shippingAddress?.fullName && o.shippingAddress.fullName.toLowerCase().includes(q)) ||
      (o.shippingAddress?.phone && o.shippingAddress.phone.includes(q));

    const matchesStatus = statusFilter === 'all' ? true : o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // 1-Click "Next step" status updater
  const handleNextStep = async (order) => {
    let nextStatus = '';
    if (order.status === 'pending') nextStatus = 'confirmed';
    else if (order.status === 'confirmed') nextStatus = 'shipping';
    else if (order.status === 'shipping') nextStatus = 'delivered';

    if (!nextStatus) return;

    try {
      setUpdatingId(order._id);
      await api.patch(`/api/admin/orders/${order._id}/status`, { status: nextStatus });
      toast.success(`Đơn hàng #${order._id.slice(-6).toUpperCase()} đã chuyển sang "${nextStatus}"!`);
      loadOrders();
    } catch (err) {
      toast.error(err.message || 'Lỗi cập nhật trạng thái');
    } finally {
      setUpdatingId(null);
    }
  };

  // Mark Payment as Paid
  const handleMarkPaid = async (orderId) => {
    try {
      setUpdatingId(orderId);
      await api.patch(`/api/admin/orders/${orderId}/payment`, { paymentStatus: 'paid' });
      toast.success(`Đã xác nhận thanh toán cho đơn hàng #${orderId.slice(-6).toUpperCase()}!`);
      loadOrders();
    } catch (err) {
      toast.error(err.message || 'Lỗi xác nhận thanh toán');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Header with Breadcrumb */}
      <div>
        <span className="text-xs font-semibold text-[#6e8578] uppercase tracking-wider block mb-1">
          FULFILMENT DESK
        </span>
        <h1 className="text-3xl font-black text-[#1c3f30] tracking-tight">
          Orders
        </h1>
        <p className="text-xs sm:text-sm text-[#5d7367] mt-0.5">
          Theo dõi và xử lý từng đơn hàng từ bàn đóng gói cho tới tận cửa nhà khách hàng.
        </p>
      </div>

      {/* 2. Four Metric Summary Cards (Tandem Orders Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#e1e6e0] shadow-sm">
          <p className="text-xs font-semibold text-[#6e8578]">Open orders</p>
          <p className="text-2xl font-black text-[#1c3f30] mt-1">{openOrders.length}</p>
          <p className="text-[11px] text-[#788e81] mt-0.5">Cần tiếp tục xử lý</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#e1e6e0] shadow-sm">
          <p className="text-xs font-semibold text-[#6e8578]">To prepare</p>
          <p className="text-2xl font-black text-amber-700 mt-1">{toPrepareOrders.length}</p>
          <p className="text-[11px] text-amber-700 mt-0.5">Cần đóng gói ngay</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#e1e6e0] shadow-sm">
          <p className="text-xs font-semibold text-[#6e8578]">In transit or delivered</p>
          <p className="text-2xl font-black text-[#2d6a4f] mt-1">{inTransitOrDelivered.length}</p>
          <p className="text-[11px] text-[#2d6a4f] mt-0.5">Đã bàn giao vận chuyển</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#e1e6e0] shadow-sm">
          <p className="text-xs font-semibold text-[#6e8578]">Open order value</p>
          <p className="text-xl sm:text-2xl font-black text-[#1c3f30] mt-1 truncate">
            {formatVND(openOrderValue)}
          </p>
          <p className="text-[11px] text-[#788e81] mt-0.5">Giá trị đơn chưa hoàn tất</p>
        </div>
      </div>

      {/* 3. Order Queue Table Card */}
      <div className="rounded-3xl bg-white border border-[#e1e6e0] shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 sm:p-6 border-b border-[#edf2ee] flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-[#788e81] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Find an order or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#f4f6f3] border-none rounded-full text-xs font-semibold text-[#1c3f30] placeholder-[#788e81] focus:ring-2 focus:ring-[#1c3f30]"
            />
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none pl-3.5 pr-8 py-2 bg-[#f4f6f3] rounded-full text-xs font-bold text-[#1c3f30] border-none cursor-pointer focus:ring-2 focus:ring-[#1c3f30]"
              >
                <option value="all">Tất cả đơn hàng ({orders.length})</option>
                <option value="pending">Chờ xác nhận (New)</option>
                <option value="confirmed">Đang đóng gói (Packing)</option>
                <option value="shipping">Đang vận chuyển (Shipped)</option>
                <option value="delivered">Đã giao hoàn tất (Delivered)</option>
                <option value="cancelled">Đã hủy (Cancelled)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#788e81] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#1c3f30]">
            <thead className="bg-[#f8faf8] border-b border-[#edf2ee] text-[11px] font-bold text-[#6e8578] uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Order</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Placed</th>
                <th className="py-3.5 px-4">Items</th>
                <th className="py-3.5 px-4">Total</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-6 text-right">Next step</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf2ee]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#788e81]">
                    Đang tải hàng đợi đơn hàng...
                  </td>
                </tr>
              ) : filteredOrders.length > 0 ? (
                filteredOrders.map((o) => {
                  const isUpdating = updatingId === o._id;
                  const isBankPending = o.paymentMethod === 'bank' && o.paymentStatus !== 'paid';

                  return (
                    <tr key={o._id} className="hover:bg-[#f8faf8] transition-colors">
                      {/* Order Code */}
                      <td className="py-4 px-6 font-mono font-bold text-sm">
                        <Link href={`/orders/${o._id}`} target="_blank" className="hover:underline flex items-center gap-1">
                          #{o._id.slice(-6).toUpperCase()}
                          <ExternalLink className="w-3 h-3 text-[#788e81]" />
                        </Link>
                        <span className="text-[10px] text-[#788e81] font-sans font-normal block">Online store</span>
                      </td>

                      {/* Customer */}
                      <td className="py-4 px-4">
                        <p className="font-bold text-sm text-[#1c3f30]">
                          {o.shippingAddress?.fullName || 'Khách hàng'}
                        </p>
                        <p className="text-[11px] text-[#788e81]">
                          {o.shippingAddress?.phone}
                        </p>
                      </td>

                      {/* Placed */}
                      <td className="py-4 px-4 text-neutral-500">
                        {formatDate(o.createdAt)}
                      </td>

                      {/* Items */}
                      <td className="py-4 px-4 font-semibold">
                        {o.items?.length || 1} món
                      </td>

                      {/* Total */}
                      <td className="py-4 px-4 font-black text-sm">
                        {formatVND(o.total)}
                      </td>

                      {/* Status Pastel Badges */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            o.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : o.status === 'confirmed'
                              ? 'bg-blue-100 text-blue-800'
                              : o.status === 'shipping'
                              ? 'bg-purple-100 text-purple-800'
                              : o.status === 'delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {o.status === 'pending'
                              ? 'New'
                              : o.status === 'confirmed'
                              ? 'Packing'
                              : o.status === 'shipping'
                              ? 'Shipped'
                              : o.status === 'delivered'
                              ? 'Delivered'
                              : 'Cancelled'}
                          </span>

                          {/* Payment tag */}
                          <span className="block text-[10px] text-[#788e81]">
                            {o.paymentMethod.toUpperCase()} • {o.paymentStatus === 'paid' ? 'Đã thu tiền' : 'Chưa thu tiền'}
                          </span>
                        </div>
                      </td>

                      {/* 1-Click "Next step" Button */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          {o.status === 'pending' && (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleNextStep(o)}
                              className="px-3.5 py-1.5 rounded-full bg-[#1c3f30] hover:bg-[#142e23] text-white text-xs font-bold transition-all shadow-sm"
                            >
                              → Start packing
                            </button>
                          )}

                          {o.status === 'confirmed' && (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleNextStep(o)}
                              className="px-3.5 py-1.5 rounded-full bg-[#1c3f30] hover:bg-[#142e23] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                            >
                              <Truck className="w-3.5 h-3.5" /> Mark shipped
                            </button>
                          )}

                          {o.status === 'shipping' && (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleNextStep(o)}
                              className="px-3.5 py-1.5 rounded-full bg-[#2d6a4f] hover:bg-[#204e3a] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" /> Complete
                            </button>
                          )}

                          {isBankPending && o.status !== 'cancelled' && (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleMarkPaid(o._id)}
                              className="px-2.5 py-1 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold transition-colors"
                            >
                              ✓ Confirm Paid
                            </button>
                          )}

                          {o.status === 'delivered' && (
                            <span className="text-[11px] font-bold text-[#2d6a4f] flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                            </span>
                          )}

                          {o.status === 'cancelled' && (
                            <span className="text-[11px] font-semibold text-rose-500">
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
                  <td colSpan={7} className="py-12 text-center text-[#788e81]">
                    Không có đơn hàng nào trong danh sách.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
