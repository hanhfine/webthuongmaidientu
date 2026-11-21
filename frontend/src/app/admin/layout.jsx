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

  // Fetch accurate pending + confirmed orders count across full dataset
  useEffect(() => {
    async function loadPendingCount() {
      if (!isAdmin) return;
      try {
        const [pRes, cRes] = await Promise.all([
          api.get('/api/admin/orders?status=pending&pageSize=1').catch(() => ({ total: 0 })),
          api.get('/api/admin/orders?status=confirmed&pageSize=1').catch(() => ({ total: 0 })),
        ]);
        setPendingOrdersCount((pRes?.total || 0) + (cRes?.total || 0));
      } catch {
        // Fallback
      }
    }
    loadPendingCount();
  }, [isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-admin-bg flex items-center justify-center text-sm text-admin-muted">
        <div className="w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full animate-spin mx-auto mb-3" />
      </div>
    );
  }

  // Restrict access to Admins only
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-admin-bg flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-admin-border shadow-xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <h2 className="text-xl font-black text-brand-green">
            Khu Vực Quản Trị Viên (Admin)
          </h2>

          <p className="text-xs text-admin-muted leading-relaxed">
            Bạn cần đăng nhập bằng tài khoản quản trị để truy cập <strong>TechStore Quản trị</strong>.
            <br />
            <span className="text-xs text-admin-muted block pt-1">
              (Tài khoản dev mặc định: <code className="bg-neutral-100 px-1 py-0.5 rounded">admin@shop.local</code>)
            </span>
          </p>

          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/login"
              className="w-full py-3 px-4 rounded-xl bg-brand-green hover:bg-brand-green-dark text-white text-xs font-bold transition-colors"
            >
              Đăng nhập tài khoản Admin
            </Link>
            <Link
              href="/"
              className="text-xs font-bold text-admin-muted hover:underline flex items-center justify-center gap-1 mt-2 py-2"
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
    <div className="min-h-screen bg-admin-bg text-brand-green flex flex-col min-w-0 w-full">
      <AdminHeader pendingOrdersCount={pendingOrdersCount} />
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {children}
      </div>
    </div>
  );
}
