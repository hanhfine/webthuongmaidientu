'use client';

import Link from 'next/link';
import {
  ShoppingBag,
  ArrowLeft,
  ShieldCheck,
  CreditCard,
  Layers,
} from 'lucide-react';
import CartItemRow from '@/components/cart/CartItemRow';
import OrderSummaryCard from '@/components/cart/OrderSummaryCard';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

export default function CartPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const {
    cart,
    cartCount,
    loading,
    appliedPromo,
    applyPromo,
    removePromo,
    storeConfig,
  } = useCart();

  if (authLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center text-sm text-neutral-400">
        <div className="w-8 h-8 border-2 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        Đang tải giỏ hàng...
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
          Tài khoản Quản trị viên không sử dụng giỏ hàng
        </h2>
        <p className="text-xs text-neutral-500 max-w-md mx-auto">
          Chức năng giỏ hàng và đặt mua chỉ áp dụng cho tài khoản khách hàng.
        </p>
        <Link
          href="/admin"
          className="inline-block px-6 py-3 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-black transition-colors"
        >
          Về Trang Quản Trị
        </Link>
      </div>
    );
  }

  const items = cart?.items || [];
  const hasItems = items.length > 0;
  const anyUnavailable = items.some((i) => !i.available);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb / Back Link */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">
            Giỏ Hàng
          </h1>
          <p className="text-xs text-neutral-600 mt-1 tabular-nums">
            Bạn có <span className="font-bold text-brand-blue">{cartCount}</span> sản phẩm trong giỏ hàng
          </p>
        </div>

        <Link
          href="/products"
          className="text-xs font-bold text-brand-blue hover:underline flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Tiếp tục mua sắm
        </Link>
      </div>

      {loading && !hasItems ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
          ))}
        </div>
      ) : hasItems ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-6">
            {!user && (
              <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="text-neutral-700 dark:text-neutral-200 font-medium text-pretty">
                  Giỏ hàng tạm thời — đăng nhập khi thanh toán để lưu đơn hàng và dùng mã giảm giá.
                </span>
                <Link
                  href="/login?redirect=/cart"
                  className="font-bold text-[#0066cc] hover:underline whitespace-nowrap shrink-0"
                >
                  Đăng nhập ngay
                </Link>
              </div>
            )}

            <div className="space-y-4">
              {items.map((item) => (
                <CartItemRow key={item.productId} item={item} />
              ))}
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 space-y-3">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-brand-blue" />
                Thông tin đơn hàng & bảo hành
              </h3>

              <div className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
                <div className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-neutral-500 shrink-0" />
                    <div>
                      <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                        Thanh toán linh hoạt COD hoặc VietQR
                      </p>
                      <p className="text-neutral-600 text-xs">
                        Áp dụng mã khuyến mãi trực tiếp ở khung tóm tắt bên cạnh
                      </p>
                    </div>
                  </div>
                </div>

                <div className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Layers className="w-5 h-5 text-neutral-500 shrink-0" />
                    <div>
                      <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                        Mua thêm phụ kiện chính hãng
                      </p>
                      <p className="text-neutral-600 text-xs">
                        Sạc nhanh GaN, bàn phím cơ, chuột và tai nghe chống ồn
                      </p>
                    </div>
                  </div>
                  <Link href="/products?category=phu-kien" className="text-[#0066cc] font-semibold hover:underline shrink-0">
                    Xem phụ kiện
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <OrderSummaryCard
              subtotal={cart.subtotal}
              shippingFee={storeConfig.shippingFee}
              appliedPromo={appliedPromo}
              onApplyPromo={applyPromo}
              onRemovePromo={removePromo}
              isGuest={!user}
              disabled={anyUnavailable}
            />
          </div>
        </div>
      ) : (
        <div className="text-center py-24 p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800">
          <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-4 text-neutral-500">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-1">
            Giỏ hàng của bạn đang trống
          </h2>
          <p className="text-xs text-neutral-600 max-w-sm mx-auto mb-6 text-pretty">
            Khám phá ngay hàng trăm sản phẩm công nghệ đỉnh cao với mức giá ưu đãi hấp dẫn.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/products"
              className="inline-block px-8 py-3 rounded-full bg-brand-blue hover:bg-brand-blue-hover text-white text-xs font-bold transition-colors"
            >
              Khám phá sản phẩm ngay
            </Link>
            {!user && (
              <Link
                href="/login?redirect=/cart"
                className="inline-block px-6 py-3 rounded-full border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 text-xs font-bold transition-colors"
              >
                Đăng nhập xem giỏ đã lưu
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
