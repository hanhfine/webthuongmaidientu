'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ShoppingBag, 
  Search, 
  User, 
  Menu, 
  X, 
  ChevronDown, 
  LogOut, 
  Package, 
  LayoutDashboard,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { NAV_ITEMS } from '@/lib/constants';
import MegaMenu from './MegaMenu';

export default function Header() {
  const router = useRouter();
  const { user, isAdmin, logout, loading: authLoading } = useAuth();
  const { cartCount } = useCart();

  const [activeMenuId, setActiveMenuId] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const closeTimeoutRef = useRef(null);
  const userMenuRef = useRef(null);

  // Close user dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mega-menu hover handlers with debounce delay
  const handleMouseEnter = (itemId) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    setActiveMenuId(itemId);
  };

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setActiveMenuId(null);
    }, 180);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const activeNavItem = NAV_ITEMS.find((item) => item.id === activeMenuId);

  return (
    <header 
      className="sticky top-0 z-40 bg-white/95 dark:bg-black/90 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800 transition-colors"
      onMouseLeave={handleMouseLeave}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* 1. Left: Mobile menu button & Brand Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-xl sm:text-2xl font-black tracking-tighter text-neutral-900 dark:text-white uppercase">
                TECH<span className="text-brand-blue">STORE</span>
              </span>
            </Link>
          </div>

          {/* 2. Middle: Desktop Navigation with Mega-Menu Hover */}
          <nav className="hidden lg:flex items-center space-x-1">
            {NAV_ITEMS.map((item) => {
              const isActive = activeMenuId === item.id;
              return (
                <div
                  key={item.id}
                  onMouseEnter={() => handleMouseEnter(item.id)}
                  className="relative py-6"
                >
                  <Link
                    href={item.href}
                    className={`px-3.5 py-1.5 text-sm font-medium rounded-full transition-all duration-200 flex items-center gap-1 ${
                      isActive
                        ? 'text-brand-blue bg-blue-50 dark:bg-blue-950/40 font-semibold'
                        : 'text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100/60 dark:hover:bg-neutral-800/60'
                    }`}
                  >
                    {item.label}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isActive ? 'rotate-180 text-brand-blue' : 'text-neutral-400'}`} />
                  </Link>
                </div>
              );
            })}
          </nav>

          {/* 3. Right: Search, Cart Badge & User Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search Button */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2.5 rounded-full text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label="Tìm kiếm sản phẩm"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Cart Icon with Counter Badge */}
            <Link
              href="/cart"
              className="relative p-2.5 rounded-full text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label="Giỏ hàng"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[20px] h-5 px-1 bg-brand-blue text-white text-[11px] font-bold rounded-full flex items-center justify-center animate-in zoom-in-75">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>

            {/* User Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-full text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700"
                aria-label="Tài khoản"
              >
                <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300 font-semibold text-xs border border-neutral-200 dark:border-neutral-700">
                  {user ? user.fullName?.charAt(0).toUpperCase() || 'U' : <User className="w-4 h-4" />}
                </div>
                {user && (
                  <span className="hidden sm:inline text-xs font-medium max-w-[100px] truncate text-neutral-800 dark:text-neutral-200">
                    {user.fullName || user.email}
                  </span>
                )}
              </button>

              {/* User Dropdown Panel */}
              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  {!authLoading && !user ? (
                    <div className="p-4 text-center">
                      <p className="text-sm font-semibold text-neutral-900 dark:text-white mb-1">
                        Chào mừng bạn
                      </p>
                      <p className="text-xs text-neutral-500 mb-4">
                        Đăng nhập để theo dõi đơn hàng và ưu đãi dành riêng
                      </p>
                      <div className="flex flex-col gap-2">
                        <Link
                          href="/login"
                          onClick={() => setUserDropdownOpen(false)}
                          className="w-full py-2 px-4 bg-brand-blue text-white rounded-xl text-xs font-semibold hover:bg-brand-blue-hover transition-colors text-center"
                        >
                          Đăng nhập
                        </Link>
                        <Link
                          href="/register"
                          onClick={() => setUserDropdownOpen(false)}
                          className="w-full py-2 px-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-xl text-xs font-semibold hover:bg-neutral-200 transition-colors text-center"
                        >
                          Tạo tài khoản mới
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
                        <p className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                          {user?.fullName || 'Khách hàng'}
                        </p>
                        <p className="text-xs text-neutral-500 truncate">{user?.email}</p>
                        {isAdmin && (
                          <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            <ShieldAlert className="w-3 h-3" />
                            Quản trị viên (Admin)
                          </span>
                        )}
                      </div>

                      <div className="py-1">
                        {isAdmin && (
                          <Link
                            href="/admin"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-brand-green hover:bg-brand-green-soft/40 transition-colors"
                          >
                            <LayoutDashboard className="w-4 h-4 text-brand-green" />
                            Trang Quản Trị (Seller Studio)
                          </Link>
                        )}
                        <Link
                          href="/orders"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        >
                          <Package className="w-4 h-4 text-neutral-400" />
                          Đơn hàng của tôi
                        </Link>
                      </div>

                      <div className="border-t border-neutral-100 dark:border-neutral-800 pt-1 mt-1">
                        <button
                          onClick={async () => {
                            setUserDropdownOpen(false);
                            await logout();
                            router.push('/');
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          Đăng xuất
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search Bar Overlay */}
        {searchOpen && (
          <div className="py-3 px-2 border-t border-neutral-200 dark:border-neutral-800 animate-in fade-in slide-in-from-top-1">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <Search className="w-5 h-5 absolute left-3.5 text-neutral-400" />
              <input
                type="text"
                autoFocus
                placeholder="Tìm kiếm điện thoại, laptop, phụ kiện công nghệ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-24 py-2.5 text-sm bg-neutral-100 dark:bg-neutral-800 rounded-full border-none focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
              <button
                type="submit"
                className="absolute right-2 px-4 py-1.5 bg-brand-blue text-white text-xs font-semibold rounded-full hover:bg-brand-blue-hover transition-colors"
              >
                Tìm
              </button>
            </form>
          </div>
        )}
      </div>

      {/* 4. Desktop Hover Mega-Menu Panel */}
      <MegaMenu
        activeItem={activeNavItem}
        onMouseEnter={() => handleMouseEnter(activeMenuId)}
        onMouseLeave={handleMouseLeave}
        onClose={() => setActiveMenuId(null)}
      />

      {/* 5. Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-16 bottom-0 bg-white dark:bg-neutral-900 z-50 overflow-y-auto p-6 animate-in slide-in-from-left">
          <nav className="space-y-6">
            <div>
              <h3 className="text-xs font-semibold tracking-wider uppercase text-neutral-400 mb-3">
                Danh Mục Sản Phẩm
              </h3>
              <ul className="space-y-3">
                {NAV_ITEMS.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-base font-semibold text-neutral-900 dark:text-white flex items-center justify-between"
                    >
                      {item.label}
                      <span className="text-xs text-brand-blue font-normal">Xem {item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-neutral-200 dark:border-neutral-800 pt-6">
              <h3 className="text-xs font-semibold tracking-wider uppercase text-neutral-400 mb-3">
                Tài Khoản
              </h3>
              {user ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold">{user.fullName || user.email}</p>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block text-sm font-semibold text-brand-green"
                    >
                      Trang Quản Trị Admin
                    </Link>
                  )}
                  <Link
                    href="/orders"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-sm text-neutral-700 dark:text-neutral-300"
                  >
                    Đơn hàng của tôi
                  </Link>
                  <button
                    onClick={async () => {
                      setMobileMenuOpen(false);
                      await logout();
                      router.push('/');
                    }}
                    className="text-sm font-semibold text-rose-600 block text-left"
                  >
                    Đăng xuất
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-2.5 px-4 bg-brand-blue text-white rounded-xl text-sm font-semibold text-center"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-2.5 px-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-xl text-sm font-semibold text-center"
                  >
                    Tạo tài khoản mới
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
