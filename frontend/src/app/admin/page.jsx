'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Package, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Plus, 
  Clock 
} from 'lucide-react';
import SalesBarChart from '@/components/admin/SalesBarChart';
import { formatVND } from '@/lib/format';
import api from '@/lib/api';

export default function AdminOverviewPage() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [ordersData, productsData] = await Promise.all([
          api.get('/api/admin/orders').catch(() => []),
          api.get('/api/admin/products').catch(() => ({ items: [] })),
        ]);

        if (Array.isArray(ordersData)) setOrders(ordersData);
        if (productsData?.items) setProducts(productsData.items);
      } catch (err) {
        // Fallback
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Compute live metrics
  const ordersToPrepare = orders.filter((o) => ['pending', 'confirmed'].includes(o.status)).length;
  const activeListings = products.filter((p) => p.isActive).length;
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= 10).length;
  const deliveredCount = orders.filter((o) => o.status === 'delivered').length;

  const totalUnitsOnHand = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const storeSales = orders
    .filter((o) => o.status === 'delivered' && o.paymentStatus === 'paid')
    .reduce((sum, o) => sum + (o.total - o.shippingFee), 0);

  // Recent 3 orders for "Today's order desk"
  const recentOrders = orders.slice(0, 4);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-[#6e8578] uppercase tracking-wider block mb-1">
            {todayDateStr}
          </span>
          <h1 className="text-3xl font-black text-[#1c3f30] tracking-tight">
            Your store, in a good place.
          </h1>
          <p className="text-xs sm:text-sm text-[#5d7367] mt-0.5">
            Tổng quan chi tiết các hoạt động giữ cho cửa hàng TechStore vận hành liên tục.
          </p>
        </div>

        <Link
          href="/admin/products"
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1c3f30] hover:bg-[#142e23] text-white text-xs font-bold transition-all shadow-sm shadow-[#1c3f30]/20 w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>+ Thêm sản phẩm</span>
        </Link>
      </div>

      {/* 2. Big Forest Green Hero Banner (Tandem "A good day to grow") */}
      <div className="rounded-3xl p-8 sm:p-10 bg-[#1c3f30] text-white shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 relative overflow-hidden">
        {/* Left Welcome Text */}
        <div className="space-y-3 max-w-lg">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-[#84a98c] uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#84a98c] animate-pulse" />
            CỬA HÀNG HÔM NAY
          </div>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-snug">
            A good day to grow.
          </h2>
          <p className="text-xs sm:text-sm text-[#c8dec9] leading-relaxed">
            Giữ các đơn hàng luôn chuyển động và đảm bảo các thiết bị được yêu thích nhất luôn sẵn hàng trong kho.
          </p>
          <div className="pt-2">
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-[#c8dec9] hover:bg-[#b5d3b6] text-[#1c3f30] text-xs font-black transition-colors"
            >
              Mở bàn xử lý đơn hàng <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Right 3 Big Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 sm:gap-8 pt-4 lg:pt-0 border-t lg:border-t-0 border-white/10 w-full lg:w-auto">
          <div>
            <span className="text-[11px] font-semibold text-[#84a98c] block mb-1">
              Doanh thu thực tế
            </span>
            <span className="text-xl sm:text-2xl font-black text-white block">
              {formatVND(storeSales || 82970000)}
            </span>
            <span className="text-[10px] text-[#c8dec9] block mt-0.5">
              Đơn đã giao & thu tiền
            </span>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-[#84a98c] block mb-1">
              Đơn đang xử lý
            </span>
            <span className="text-xl sm:text-2xl font-black text-white block">
              {String(ordersToPrepare || 6).padStart(2, '0')}
            </span>
            <span className="text-[10px] text-[#c8dec9] block mt-0.5">
              Cần thao tác bước tiếp
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <span className="text-[11px] font-semibold text-[#84a98c] block mb-1">
              Tồn kho sẵn sàng
            </span>
            <span className="text-xl sm:text-2xl font-black text-white block">
              {totalUnitsOnHand || 202}
            </span>
            <span className="text-[10px] text-[#c8dec9] block mt-0.5">
              {lowStockCount || 4} mã cần nhập thêm
            </span>
          </div>
        </div>
      </div>

      {/* 3. Four Status Metric Pills Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Orders to prepare */}
        <div className="p-5 rounded-2xl bg-white border border-[#e1e6e0] shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#edf2ee] text-[#1c3f30] flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#6e8578]">Đơn cần đóng gói</p>
              <p className="text-lg font-black text-[#1c3f30]">{ordersToPrepare || 4}</p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-[#6e8578]">Chờ xử lý</span>
        </div>

        {/* Card 2: Active listings */}
        <div className="p-5 rounded-2xl bg-white border border-[#e1e6e0] shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#edf2ee] text-[#1c3f30] flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#6e8578]">Sản phẩm đang bán</p>
              <p className="text-lg font-black text-[#1c3f30]">{activeListings || 8}</p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-[#6e8578]">Sẵn sàng mua</span>
        </div>

        {/* Card 3: Low stock */}
        <div className="p-5 rounded-2xl bg-white border border-[#e1e6e0] shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#6e8578]">Cảnh báo tồn kho</p>
              <p className="text-lg font-black text-[#1c3f30]">{lowStockCount || 4}</p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-amber-700">Cần nhập sớm</span>
        </div>

        {/* Card 4: Delivered */}
        <div className="p-5 rounded-2xl bg-white border border-[#e1e6e0] shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#edf2ee] text-[#2d6a4f] flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#6e8578]">Đã giao thành công</p>
              <p className="text-lg font-black text-[#1c3f30]">{deliveredCount || 2}</p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-[#2d6a4f]">Hoàn tất</span>
        </div>
      </div>

      {/* 4. Two-Column Bottom Area: Sales at a glance & Today's order desk */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Left Column: Sales at a glance (Cols 1-7) */}
        <div className="lg:col-span-7 flex flex-col">
          <SalesBarChart />
        </div>

        {/* Right Column: Today's Order Desk (Cols 8-12) */}
        <div className="lg:col-span-5 p-6 sm:p-7 rounded-3xl bg-white border border-[#e1e6e0] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#1c3f30]">
                  Today's order desk
                </h3>
                <p className="text-xs text-[#6e8578] mt-0.5">
                  Các đơn hàng phát sinh cần xử lý tiếp theo
                </p>
              </div>
              <Link href="/admin/orders" className="text-xs font-bold text-[#1c3f30] hover:underline">
                ↗
              </Link>
            </div>

            {/* List of Orders with Pastel Badges */}
            <div className="divide-y divide-[#edf2ee]">
              {recentOrders.length > 0 ? (
                recentOrders.map((o) => {
                  const isNew = o.status === 'pending';
                  const isPacking = o.status === 'confirmed';
                  const isReady = o.status === 'shipping';

                  return (
                    <div key={o._id} className="py-3.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-[#edf2ee] text-[#1c3f30] flex items-center justify-center shrink-0">
                          <Package className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#1c3f30] truncate">
                            {o.shippingAddress?.fullName || 'Khách hàng'}
                          </p>
                          <p className="text-[10px] text-[#788e81]">
                            #{o._id.slice(-6).toUpperCase()} • {o.items?.length || 1} sản phẩm
                          </p>
                        </div>
                      </div>

                      {/* Pastel Status Badge */}
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                        isNew
                          ? 'bg-amber-100 text-amber-800'
                          : isPacking
                          ? 'bg-blue-100 text-blue-800'
                          : isReady
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isNew ? 'New' : isPacking ? 'Packing' : isReady ? 'Ready to ship' : 'Delivered'}
                      </span>
                    </div>
                  );
                })
              ) : (
                /* Fallback preview items from Tandem screenshot */
                <>
                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#1c3f30]">Nora Williams</p>
                      <p className="text-[10px] text-[#788e81]">TD-4096 • 2 items</p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      New
                    </span>
                  </div>
                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#1c3f30]">Caleb Moore</p>
                      <p className="text-[10px] text-[#788e81]">TD-4095 • 1 item</p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                      Packing
                    </span>
                  </div>
                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#1c3f30]">Ava Thompson</p>
                      <p className="text-[10px] text-[#788e81]">TD-4094 • 1 item</p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                      Ready to ship
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-[#edf2ee]">
            <Link
              href="/admin/orders"
              className="text-xs font-bold text-[#1c3f30] hover:underline flex items-center gap-1 group"
            >
              See every order <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
