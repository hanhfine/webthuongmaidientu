'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Store,
  Bell,
  Plus,
  LogOut,
  ExternalLink,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function AdminHeader({ pendingOrdersCount = 0, onAddProductClick }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navLinks = [
    { label: 'Tổng quan', href: '/admin', exact: true },
    { label: 'Đơn hàng', href: '/admin/orders', badge: pendingOrdersCount > 0 ? pendingOrdersCount : null },
    { label: 'Sản phẩm', href: '/admin/products' },
    { label: 'Kho hàng', href: '/admin/inventory' },
    { label: 'Khuyến mãi', href: '/admin/promotions' },
    { label: 'Người dùng', href: '/admin/users' },
  ];

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-admin-surface border-b border-admin-border transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between gap-3 h-16">
          {/* Left: Brand & Top Horizontal Navigation Tabs */}
          <div className="flex items-center gap-3 xl:gap-5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen((prev) => !prev)}
              className="xl:hidden p-2 rounded-lg text-admin-muted hover:bg-admin-hover hover:text-brand-green cursor-pointer shrink-0"
              aria-label="Mở menu quản trị"
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <Link href="/admin" className="flex items-center gap-2 shrink-0 whitespace-nowrap">
              <div className="w-8 h-8 rounded-xl bg-brand-green text-white flex items-center justify-center font-bold text-sm shrink-0">
                <Store className="w-4 h-4" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-brand-green">
                  TechStore
                </span>
                <span className="hidden sm:inline text-xs font-semibold text-admin-muted tracking-wide">
                  Quản trị
                </span>
              </div>
            </Link>

            <nav className="hidden xl:flex items-center gap-0.5">
              {navLinks.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname?.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative px-2.5 py-2 text-xs font-bold transition-colors rounded-lg flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'text-brand-green bg-admin-active'
                        : 'text-admin-muted hover:text-brand-green hover:bg-admin-hover'
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="px-1.5 py-0.5 rounded-full text-xs leading-none font-extrabold bg-brand-green-light text-white tabular-nums">
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-brand-green rounded-full" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Actions, Notifications & Store Profile */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/"
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1 h-9 px-3 rounded-full text-xs font-semibold text-admin-muted hover:text-brand-green hover:bg-admin-hover transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Xem cửa hàng khách hàng"
            >
              <span>Xem Web</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </Link>

            <Link
              href="/admin/orders?status=pending"
              className="relative w-9 h-9 rounded-full text-admin-muted hover:bg-admin-hover hover:text-brand-green transition-colors flex items-center justify-center shrink-0 cursor-pointer"
              aria-label="Đơn hàng chờ xác nhận"
              title="Xem đơn chờ xử lý"
            >
              <Bell className="w-4 h-4" />
              {pendingOrdersCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500" />
              )}
            </Link>

            {onAddProductClick ? (
              <button
                type="button"
                onClick={onAddProductClick}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-brand-green hover:bg-brand-green-dark text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Thêm sản phẩm</span>
              </button>
            ) : (
              <Link
                href="/admin/products?new=1"
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-brand-green hover:bg-brand-green-dark text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Thêm sản phẩm</span>
              </Link>
            )}

            <div className="flex items-center gap-2 pl-2 border-l border-admin-border shrink-0">
              <div className="w-8 h-8 rounded-full bg-admin-tint text-brand-green font-black text-xs flex items-center justify-center shrink-0">
                {user?.fullName?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-bold text-brand-green leading-tight truncate max-w-[140px]">
                  {user?.fullName || 'Quản trị viên'}
                </p>
                <p className="text-xs text-admin-muted leading-tight whitespace-nowrap truncate max-w-[140px]">
                  {user?.fullName && user.fullName !== 'Quản trị viên'
                    ? 'Quản trị viên'
                    : user?.email || 'Hệ thống quản trị'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="w-9 h-9 rounded-lg text-admin-muted hover:text-rose-700 hover:bg-rose-500/10 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                title="Đăng xuất"
                aria-label="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile / Tablet Nav Drawer */}
        {mobileNavOpen && (
          <nav className="xl:hidden py-3 border-t border-admin-border grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {navLinks.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between ${
                    isActive
                      ? 'bg-admin-active text-brand-green'
                      : 'text-admin-muted hover:bg-admin-hover'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 rounded-full text-xs leading-none bg-brand-green-light text-white tabular-nums">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
}
