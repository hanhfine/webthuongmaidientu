'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Store, 
  Bell, 
  Plus, 
  LogOut, 
  ExternalLink 
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function AdminHeader({ pendingOrdersCount = 0, onAddProductClick }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navLinks = [
    { label: 'Overview', href: '/admin', exact: true },
    { label: 'Orders', href: '/admin/orders', badge: pendingOrdersCount > 0 ? pendingOrdersCount : null },
    { label: 'Products', href: '/admin/products' },
    { label: 'Inventory', href: '/admin/inventory' },
    { label: 'Promotions', href: '/admin/promotions' },
    { label: 'Users', href: '/admin/users' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#f8faf8] border-b border-[#e1e6e0] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-18">
          
          {/* Left: Brand & Top Horizontal Navigation Tabs */}
          <div className="flex items-center gap-8">
            {/* Logo */}
            <Link href="/admin" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-xl bg-[#1c3f30] text-white flex items-center justify-center font-bold text-sm shadow-sm">
                <Store className="w-4 h-4" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-[#1c3f30]">
                  tandem.
                </span>
                <span className="text-xs font-semibold text-[#526a5d] tracking-wide">
                  Seller Studio
                </span>
              </div>
            </Link>

            {/* Navigation Tabs (Tandem Seller Studio Style) */}
            <nav className="hidden md:flex items-center space-x-1">
              {navLinks.map((item) => {
                const isActive = item.exact 
                  ? pathname === item.href 
                  : pathname?.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative px-3.5 py-2 text-xs font-bold transition-all rounded-lg flex items-center gap-1.5 ${
                      isActive
                        ? 'text-[#1c3f30] bg-[#e7eee6]'
                        : 'text-[#5d7367] hover:text-[#1c3f30] hover:bg-[#eef3ed]'
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-[#2d6a4f] text-white">
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#1c3f30] rounded-full" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Actions, Notifications & Store Profile */}
          <div className="flex items-center gap-3">
            {/* View Live Store */}
            <Link
              href="/"
              target="_blank"
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-[#5d7367] hover:text-[#1c3f30] hover:bg-[#eef3ed] transition-colors"
              title="Xem cửa hàng khách hàng"
            >
              <span>Xem Web</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            {/* Notification Bell */}
            <button
              type="button"
              className="p-2 rounded-full text-[#5d7367] hover:bg-[#eef3ed] hover:text-[#1c3f30] transition-colors"
              aria-label="Thông báo"
            >
              <Bell className="w-4 h-4" />
            </button>

            {/* "+ New listing" / "+ Add product" CTA Button */}
            {onAddProductClick ? (
              <button
                type="button"
                onClick={onAddProductClick}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1c3f30] hover:bg-[#142e23] text-white text-xs font-bold transition-all shadow-sm shadow-[#1c3f30]/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Thêm sản phẩm</span>
              </button>
            ) : (
              <Link
                href="/admin/products"
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1c3f30] hover:bg-[#142e23] text-white text-xs font-bold transition-all shadow-sm shadow-[#1c3f30]/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Thêm sản phẩm</span>
              </Link>
            )}

            {/* User Profile Avatar with Tooltip / Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-[#e1e6e0]">
              <div className="w-8 h-8 rounded-full bg-[#c8dec9] text-[#1c3f30] font-black text-xs flex items-center justify-center">
                {user?.fullName?.charAt(0).toUpperCase() || 'H'}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-bold text-[#1c3f30] leading-tight truncate max-w-[120px]">
                  {user?.fullName || 'Harbor Goods'}
                </p>
                <p className="text-[10px] text-[#788e81] leading-tight">
                  Owner account
                </p>
              </div>

              <button
                onClick={logout}
                className="p-1.5 rounded-lg text-[#788e81] hover:text-rose-600 hover:bg-rose-50 transition-colors ml-1"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
