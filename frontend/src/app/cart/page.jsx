'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ShoppingBag, 
  ArrowLeft, 
  ShieldCheck, 
  Smartphone, 
  Sparkles, 
  CreditCard,
  Layers
} from 'lucide-react';
import CartItemRow from '@/components/cart/CartItemRow';
import OrderSummaryCard from '@/components/cart/OrderSummaryCard';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

export default function CartPage() {
  const { user } = useAuth();
  const { cart, cartCount, loading } = useCart();
  const [appliedPromo, setAppliedPromo] = useState(null);

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/60 text-brand-blue flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
          Đăng nhập để xem giỏ hàng của bạn
        </h2>
        <p className="text-xs text-neutral-500 max-w-sm mx-auto mb-6">
          Các sản phẩm đã lưu và ưu đãi thành viên sẽ hiển thị khi bạn đăng nhập tài khoản.
        </p>
        <Link
          href="/login"
          className="inline-block px-8 py-3.5 rounded-full bg-brand-blue text-white text-xs font-bold hover:bg-brand-blue-hover transition-colors shadow-lg shadow-blue-600/30"
        >
          Đăng nhập ngay
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
          <p className="text-xs text-neutral-500 mt-1">
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

      {hasItems ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Items List & Upsell Services (Cols 1-7) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Products List */}
            <div className="space-y-4">
              {items.map((item) => (
                <CartItemRow key={item.productId} item={item} />
              ))}
            </div>

            {/* Upsell Special Offers (from Samsung screenshot) */}
            <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-blue" />
                Đặc quyền kèm theo đơn hàng
              </h3>

              <div className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
                <div className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-neutral-400" />
                    <div>
                      <p className="font-bold text-neutral-800 dark:text-neutral-200">Thu cũ đổi mới trợ giá tới 3 triệu</p>
                      <p className="text-neutral-400 text-[11px]">Hỗ trợ lên đời siêu phẩm giá tốt nhất</p>
                    </div>
                  </div>
                  <span className="text-brand-blue font-semibold cursor-pointer hover:underline">Tham gia</span>
                </div>

                <div className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-neutral-400" />
                    <div>
                      <p className="font-bold text-neutral-800 dark:text-neutral-200">Gói Bảo Hành VIP Care+</p>
                      <p className="text-neutral-400 text-[11px]">1 đổi 1 trong 12 tháng đối với lỗi phần cứng</p>
                    </div>
                  </div>
                  <span className="text-brand-blue font-semibold cursor-pointer hover:underline">Thêm vào</span>
                </div>

                <div className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-neutral-400" />
                    <div>
                      <p className="font-bold text-neutral-800 dark:text-neutral-200">Giảm ngay 1 Triệu khi thanh toán VietQR</p>
                      <p className="text-neutral-400 text-[11px]">Áp dụng tự động tại bước thanh toán</p>
                    </div>
                  </div>
                  <span className="text-emerald-600 font-bold">Đã kích hoạt</span>
                </div>

                <div className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Layers className="w-5 h-5 text-neutral-400" />
                    <div>
                      <p className="font-bold text-neutral-800 dark:text-neutral-200">Ưu đãi phụ kiện mua kèm</p>
                      <p className="text-neutral-400 text-[11px]">Giảm tới 50% ốp lưng và củ sạc nhanh</p>
                    </div>
                  </div>
                  <Link href="/products?category=phu-kien" className="text-brand-blue font-semibold hover:underline">
                    Xem phụ kiện
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary (Cols 8-12) */}
          <div className="lg:col-span-5">
            <OrderSummaryCard
              subtotal={cart.subtotal}
              appliedPromo={appliedPromo}
              onApplyPromo={(promo) => setAppliedPromo(promo)}
              onRemovePromo={() => setAppliedPromo(null)}
              disabled={anyUnavailable}
            />
          </div>
        </div>
      ) : (
        /* Empty Cart State */
        <div className="text-center py-24 p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800">
          <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-4 text-neutral-400">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-1">
            Giỏ hàng của bạn đang trống
          </h2>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto mb-6">
            Khám phá ngay hàng trăm sản phẩm công nghệ đỉnh cao với mức giá ưu đãi hấp dẫn.
          </p>
          <Link
            href="/products"
            className="inline-block px-8 py-3 rounded-full bg-brand-blue hover:bg-brand-blue-hover text-white text-xs font-bold transition-colors shadow-md"
          >
            Khám phá sản phẩm ngay
          </Link>
        </div>
      )}
    </div>
  );
}
