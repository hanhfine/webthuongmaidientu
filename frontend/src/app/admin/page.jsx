'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Package, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight
} from 'lucide-react';
import SalesBarChart from '@/components/admin/SalesBarChart';
import { formatVND } from '@/lib/format';
import api from '@/lib/api';

export default function AdminOverviewPage() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [deliveredTotal, setDeliveredTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const todayVn = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Ho_Chi_Minh',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date());

        const [ordersData, productsData, revenueData, pendingRes, confirmedRes, deliveredRes] = await Promise.all([
          api.get('/api/admin/orders?pageSize=50').catch(() => ({ items: [] })),
          api.get('/api/admin/products?pageSize=50').catch(() => ({ items: [] })),
          api.get(`/api/admin/stats/revenue?from=2020-01-01&to=${todayVn}`).catch(() => ({ revenue: 0 })),
          api.get('/api/admin/orders?status=pending&pageSize=1').catch(() => ({ total: 0 })),
          api.get('/api/admin/orders?status=confirmed&pageSize=1').catch(() => ({ total: 0 })),
          api.get('/api/admin/orders?status=delivered&pageSize=1').catch(() => ({ total: 0 })),
        ]);

        const orderList = Array.isArray(ordersData) ? ordersData : (ordersData?.items || []);
        const productList = Array.isArray(productsData) ? productsData : (productsData?.items || []);
        setOrders(orderList);
        setProducts(productList);
        setTotalRevenue(typeof revenueData?.revenue === 'number' ? revenueData.revenue : 0);
        setPendingTotal((pendingRes?.total || 0) + (confirmedRes?.total || 0));
        setDeliveredTotal(deliveredRes?.total || 0);
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Compute live metrics
  const ordersToPrepare = pendingTotal;
  const activeListings = products.filter((p) => p.isActive).length;
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= 10).length;
  const deliveredCount = deliveredTotal;

  const totalUnitsOnHand = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const storeSales = totalRevenue;

  // Prioritize active orders needing action, falling back to recent orders
  const activeOrders = orders.filter((o) => ['pending', 'confirmed', 'shipping'].includes(o.status));
  const fallbackOrders = orders.filter((o) => !['pending', 'confirmed', 'shipping'].includes(o.status));
  const recentOrders = [...activeOrders, ...fallbackOrders].slice(0, 4);
  const hasActiveOrders = activeOrders.length > 0;

  // Today date format
  const todayDateStr = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date());

  return (
    <div className="space-y-8">
      {/* 1. Header with Date & Subheader */}
      <div>
        <span className="text-xs font-semibold text-admin-muted uppercase tracking-wider block mb-1">
          {todayDateStr}
        </span>
        <h1 className="text-3xl font-black text-brand-green tracking-tight">
          Tổng quan cửa hàng
        </h1>
        <p className="text-xs sm:text-sm text-admin-muted mt-0.5">
          Theo dõi nhanh doanh thu, đơn hàng cần xử lý và tồn kho tại TechStore.
        </p>
      </div>

      {/* 2. Big Forest Green Hero Banner */}
      <div className="rounded-3xl p-7 sm:p-10 bg-brand-green text-white shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 relative overflow-hidden">
        {/* Left Welcome Text */}
        <div className="space-y-3 max-w-lg min-w-0">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-admin-muted-dark uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-admin-muted-dark animate-pulse" />
            CỬA HÀNG HÔM NAY
          </div>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-snug">
            Tình hình kinh doanh hôm nay
          </h2>
          <p className="text-xs sm:text-sm text-admin-tint leading-relaxed text-pretty">
            Giữ các đơn hàng luôn chuyển động và đảm bảo các thiết bị được yêu thích nhất luôn sẵn hàng trong kho.
          </p>
          <div className="pt-2">
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-admin-tint hover:bg-admin-tint-hover text-brand-green text-xs font-black transition-colors"
            >
              Mở bàn xử lý đơn hàng <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Right 3 Big Metrics */}
        <div className="flex flex-wrap xl:flex-nowrap items-start gap-x-8 gap-y-5 pt-4 lg:pt-0 border-t lg:border-t-0 border-white/10 w-full lg:w-auto shrink-0">
          <div>
            <span className="text-xs font-semibold text-admin-muted-dark block mb-1 whitespace-nowrap">
              Doanh thu thực tế
            </span>
            <span className="text-xl sm:text-2xl font-black text-white block whitespace-nowrap tabular-nums">
              {formatVND(storeSales)}
            </span>
            <span className="text-xs text-admin-tint block mt-0.5 whitespace-nowrap">
              Đơn đã giao & thu tiền
            </span>
          </div>

          <div>
            <span className="text-xs font-semibold text-admin-muted-dark block mb-1 whitespace-nowrap">
              Đơn đang xử lý
            </span>
            <span className="text-xl sm:text-2xl font-black text-white block whitespace-nowrap tabular-nums">
              {String(ordersToPrepare).padStart(2, '0')}
            </span>
            <span className="text-xs text-admin-tint block mt-0.5 whitespace-nowrap">
              Cần thao tác bước tiếp
            </span>
          </div>

          <div>
            <span className="text-xs font-semibold text-admin-muted-dark block mb-1 whitespace-nowrap">
              Tồn kho sẵn sàng
            </span>
            <span className="text-xl sm:text-2xl font-black text-white block whitespace-nowrap tabular-nums">
              {totalUnitsOnHand}
            </span>
            <span className="text-xs text-admin-tint block mt-0.5 whitespace-nowrap">
              {lowStockCount} mã cần nhập thêm
            </span>
          </div>
        </div>
      </div>

      {/* 3. Four Status Metric Pills Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Orders to prepare */}
        <div className="p-5 rounded-2xl bg-white border border-admin-border shadow-sm flex items-center justify-between gap-2">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-admin-soft text-brand-green flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-admin-muted">Đơn cần đóng gói</p>
              <p className="text-lg font-black text-brand-green tabular-nums">{ordersToPrepare}</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-admin-muted whitespace-nowrap">Chờ xử lý</span>
        </div>

        {/* Card 2: Active listings */}
        <div className="p-5 rounded-2xl bg-white border border-admin-border shadow-sm flex items-center justify-between gap-2">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-admin-soft text-brand-green flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-admin-muted">Sản phẩm đang bán</p>
              <p className="text-lg font-black text-brand-green tabular-nums">{activeListings}</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-admin-muted whitespace-nowrap">Sẵn sàng mua</span>
        </div>

        {/* Card 3: Low stock */}
        <div className="p-5 rounded-2xl bg-white border border-admin-border shadow-sm flex items-center justify-between gap-2">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-admin-muted">Cảnh báo tồn kho</p>
              <p className="text-lg font-black text-brand-green tabular-nums">{lowStockCount}</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-amber-700 whitespace-nowrap">Cần nhập sớm</span>
        </div>

        {/* Card 4: Delivered */}
        <div className="p-5 rounded-2xl bg-white border border-admin-border shadow-sm flex items-center justify-between gap-2">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-admin-soft text-brand-green-light flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-admin-muted">Đã giao thành công</p>
              <p className="text-lg font-black text-brand-green tabular-nums">{deliveredCount}</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-brand-green-light whitespace-nowrap">Hoàn tất</span>
        </div>
      </div>

      {/* 4. Two-Column Bottom Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Left Column: Sales */}
        <div className="lg:col-span-7 flex flex-col">
          <SalesBarChart />
        </div>

        {/* Right Column: Recent Orders */}
        <div className="lg:col-span-5 p-6 sm:p-7 rounded-3xl bg-white border border-admin-border shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-brand-green">
                  Đơn hàng mới nhất
                </h3>
                <p className="text-xs text-admin-muted mt-0.5">
                  {hasActiveOrders
                    ? 'Các đơn hàng phát sinh cần xử lý tiếp theo'
                    : 'Lịch sử đơn hàng phát sinh gần đây'}
                </p>
              </div>
              <Link
                href="/admin/orders"
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-xs font-bold text-brand-green hover:bg-admin-soft transition-colors shrink-0"
                aria-label="Mở danh sách đơn hàng"
                title="Mở danh sách đơn hàng"
              >
                ↗
              </Link>
            </div>

            {/* List of Orders with Pastel Badges */}
            <div className="divide-y divide-admin-soft">
              {recentOrders.length > 0 ? (
                recentOrders.map((o) => {
                  const isNew = o.status === 'pending';
                  const isPacking = o.status === 'confirmed';
                  const isReady = o.status === 'shipping';
                  const isCancelled = o.status === 'cancelled';

                  const badgeStyle = isNew
                    ? 'bg-amber-50 text-amber-700'
                    : isPacking
                    ? 'bg-blue-50 text-blue-700'
                    : isReady
                    ? 'bg-zinc-100 text-zinc-700'
                    : isCancelled
                    ? 'bg-red-50 text-red-700'
                    : 'bg-emerald-50 text-emerald-700';

                  const badgeLabel = isNew
                    ? 'Chờ duyệt'
                    : isPacking
                    ? 'Đang đóng gói'
                    : isReady
                    ? 'Đang giao'
                    : isCancelled
                    ? 'Đã hủy'
                    : 'Đã giao';

                  return (
                    <div key={o._id} className="py-3.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-admin-soft text-brand-green flex items-center justify-center shrink-0">
                          <Package className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-brand-green truncate">
                            {o.shippingAddress?.fullName || 'Khách hàng'}
                          </p>
                          <p className="text-xs text-admin-muted font-mono tabular-nums">
                            #{o._id.slice(-8).toUpperCase()} • {o.items?.length || 1} sản phẩm
                          </p>
                        </div>
                      </div>

                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 whitespace-nowrap ring-1 ring-inset ring-black/5 ${badgeStyle}`}>
                        <span className="size-1.5 rounded-full bg-current" />
                        {badgeLabel}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="py-10 text-center text-xs text-admin-muted space-y-1">
                  <p className="font-semibold text-brand-green">Chưa có đơn hàng nào phát sinh</p>
                  <p>Khi khách hàng đặt đơn, danh sách đơn mới sẽ tự động xuất hiện tại đây.</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-admin-soft">
            <Link
              href="/admin/orders"
              className="py-2 text-xs font-bold text-brand-green hover:underline inline-flex items-center gap-1"
            >
              Xem tất cả đơn hàng <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
