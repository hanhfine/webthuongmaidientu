'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import AdminHeader from '@/components/layout/AdminHeader';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

export default function AdminLayout({ children }) {
  const { user, isAdmin, loading } = useAuth();
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);

  // Poll or fetch pending orders badge count
  useEffect(() => {
    async function loadPendingCount() {
      if (!isAdmin) return;
      try {
        const orders = await api.get('/api/admin/orders');
        if (Array.isArray(orders)) {
          const pending = orders.filter((o) => ['pending', 'confirmed'].includes(o.status)).length;
          setPendingOrdersCount(pending);
        }
      } catch (err) {
        // Fallback
      }
    }
    loadPendingCount();
  }, [isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f6f3] flex items-center justify-center text-sm text-[#5d7367]">
        <div className="w-8 h-8 border-2 border-[#1c3f30] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
      </div>
    );
  }

  // Restrict access to Admins only
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#f4f6f3] flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#e1e6e0] shadow-xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <h2 className="text-xl font-black text-[#1c3f30]">
            Khu Vực Quản Trị Viên (Admin)
          </h2>

          <p className="text-xs text-[#5d7367] leading-relaxed">
            Bạn cần đăng nhập bằng tài khoản quản trị để truy cập <strong>Tandem Seller Studio</strong>.
            <br />
            <span className="text-[11px] text-neutral-400 block pt-1">
              (Tài khoản dev mặc định: <code className="bg-neutral-100 px-1 py-0.5 rounded">admin@shop.local</code>)
            </span>
          </p>

          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/login"
              className="w-full py-3 px-4 rounded-xl bg-[#1c3f30] hover:bg-[#142e23] text-white text-xs font-bold transition-colors"
            >
              Đăng nhập tài khoản Admin
            </Link>
            <Link
              href="/"
              className="text-xs font-bold text-[#5d7367] hover:underline flex items-center justify-center gap-1 mt-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Quay về trang mua sắm
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6f3] text-[#1c3f30] flex flex-col">
      <AdminHeader pendingOrdersCount={pendingOrdersCount} />
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {children}
      </div>
    </div>
  );
}
