'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Star,
  ShoppingBag,
  Zap,
  ShieldCheck,
  Truck,
  RotateCcw,
  ChevronRight,
} from 'lucide-react';
import ProductGallery from '@/components/product/ProductGallery';
import ProductSpecs from '@/components/product/ProductSpecs';
import ProductReviews from '@/components/product/ProductReviews';
import { formatVND } from '@/lib/format';
import { resolveProductGallery } from '@/lib/productImage';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import api from '@/lib/api';

export default function ProductDetailPage({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const slugOrId = resolvedParams.slug;

  const { user, isAdmin } = useAuth();
  const { addToCart } = useCart();
  const toast = useToast();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('specs');
  const [addingToCart, setAddingToCart] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);

  const loadProduct = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await api.get(`/api/products/${slugOrId}`);
      setProduct(data);
    } catch {
      if (!silent) setProduct(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [slugOrId]);

  useEffect(() => {
    loadProduct(false);
  }, [loadProduct]);

  const handleAddToCart = async () => {
    if (!product || addingToCart || buyingNow) return;
    try {
      setAddingToCart(true);
      await addToCart(product._id, 1, product);
      toast.success(`Đã thêm "${product.name}" vào giỏ hàng!`);
    } catch (err) {
      toast.error(err.message || 'Không thể thêm vào giỏ hàng');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product || buyingNow || addingToCart) return;
    try {
      setBuyingNow(true);
      await addToCart(product._id, 1, product);
      if (!user) {
        toast.info('Đã thêm vào giỏ — đăng nhập để hoàn tất đặt hàng');
        router.push('/login?redirect=/checkout');
        return;
      }
      router.push('/checkout');
    } catch (err) {
      toast.error(err.message || 'Không thể thêm sản phẩm để mua ngay');
    } finally {
      setBuyingNow(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center text-sm text-neutral-400">
        <div className="w-8 h-8 border-2 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        Đang tải thông tin sản phẩm...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h2 className="text-xl font-bold mb-2">Không tìm thấy sản phẩm</h2>
        <Link href="/products" className="text-sm font-semibold text-[#0066cc] inline-block py-2 hover:underline">
          Quay lại danh sách sản phẩm
        </Link>
      </div>
    );
  }

  const galleryImages = resolveProductGallery(product);
  const isOutOfStock = (product.stock ?? 0) <= 0;
  const hasReviews = (product.ratingCount || 0) > 0;

  return (
    <div className="max-w-7xl mx-auto w-full min-w-0 px-4 sm:px-6 py-8">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-xs text-neutral-600 mb-6 min-w-0">
        <Link href="/" className="py-1.5 inline-flex items-center whitespace-nowrap shrink-0 hover:text-neutral-900 dark:hover:text-white">Trang chủ</Link>
        <ChevronRight className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
        <Link href="/products" className="py-1.5 inline-flex items-center whitespace-nowrap shrink-0 hover:text-neutral-900 dark:hover:text-white">Sản phẩm</Link>
        <ChevronRight className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
        <span className="text-neutral-900 dark:text-white font-medium truncate min-w-0 flex-1">{product.name}</span>
      </nav>

      {/* Main 2-Column Product Purchase Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start mb-16">
        {/* Left Column: Image Gallery (Cols 1-7) */}
        <div className="lg:col-span-7 lg:sticky lg:top-24 min-w-0">
          <ProductGallery images={galleryImages} title={product.name} />
        </div>

        {/* Right Column: Buying Details (Cols 8-12) */}
        <div className="lg:col-span-5 space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {product.brand && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-neutral-800 text-zinc-700 dark:text-neutral-300 ring-1 ring-inset ring-black/5">
                  {product.brand}
                </span>
              )}
              {isOutOfStock ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 ring-1 ring-inset ring-black/5">
                  <span className="size-1.5 rounded-full bg-current" />
                  Hết hàng
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-black/5">
                  <span className="size-1.5 rounded-full bg-current" />
                  Còn {product.stock} sản phẩm
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white text-balance">
              {product.name}
            </h1>

            {/* Ratings summary */}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex text-amber-400">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      hasReviews && i < Math.round(product.ratingAvg)
                        ? 'fill-current'
                        : 'text-neutral-300 dark:text-neutral-700'
                    }`}
                  />
                ))}
              </div>
              {hasReviews ? (
                <>
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 tabular-nums">
                    {Number(product.ratingAvg).toFixed(1)}
                  </span>
                  <span className="text-xs text-neutral-600 tabular-nums">
                    ({product.ratingCount} đánh giá)
                  </span>
                </>
              ) : (
                <span className="text-xs text-neutral-600">Chưa có đánh giá</span>
              )}
            </div>
          </div>

          {/* Pricing Card */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-800">
            <div className="flex items-baseline gap-3 mb-1">
              <span className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tabular-nums whitespace-nowrap">
                {formatVND(product.price)}
              </span>
            </div>
            <p className="text-xs text-neutral-600 tabular-nums">
              Hoặc trả góp 0% từ {formatVND(Math.round((product.price || 0) / 12))}/tháng
            </p>
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-sm/6 text-neutral-600 dark:text-neutral-300 text-pretty">
              {product.description}
            </p>
          )}

          {/* Policy Benefits */}
          <div className="p-4 rounded-2xl bg-neutral-900 text-white space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Zap className="w-4 h-4 fill-current" />
              Ưu đãi khi đặt hàng online
            </h4>
            <ul className="space-y-1.5 text-xs text-neutral-300">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span>Hỗ trợ thanh toán COD khi nhận hàng hoặc chuyển khoản VietQR</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span>
                  Nhập mã <code className="font-mono font-bold text-amber-300">WELCOME10</code> giảm 10% tại bước thanh toán
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span>Bảo hành chính hãng 12 tháng, đổi trả trong 15 ngày</span>
              </li>
            </ul>
          </div>

          {/* CTA Action Buttons */}
          {isAdmin ? (
            <div className="p-3.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-600 dark:text-neutral-300">
              Tài khoản Quản trị viên chỉ xem sản phẩm. Chuyển sang tài khoản khách hàng để đặt mua.
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <button
                type="button"
                disabled={buyingNow || addingToCart || isOutOfStock}
                onClick={handleBuyNow}
                className="w-full py-3.5 px-6 rounded-xl bg-brand-blue hover:bg-brand-blue-hover text-white text-sm font-bold tracking-wide transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isOutOfStock ? 'TẠM HẾT HÀNG' : buyingNow ? 'Đang chuyển thanh toán...' : 'MUA NGAY'}
              </button>

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={addingToCart || buyingNow || isOutOfStock}
                className="w-full py-3 px-6 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                {addingToCart ? 'Đang thêm...' : 'THÊM VÀO GIỎ HÀNG'}
              </button>
            </div>
          )}

          {/* Service Commitments */}
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-600 text-center">
            <div className="flex flex-col items-center gap-1">
              <Truck className="w-4 h-4 text-neutral-500" />
              <span>Giao hàng nhanh 2h</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <RotateCcw className="w-4 h-4 text-neutral-500" />
              <span>15 ngày đổi trả</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-neutral-500" />
              <span>Bảo hành chính hãng</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section: Thông số kỹ thuật & Đánh giá */}
      <div className="space-y-8">
        <div className="flex items-center gap-4 border-b border-neutral-200 dark:border-neutral-800">
          <button
            type="button"
            onClick={() => setActiveTab('specs')}
            className={`py-2.5 text-sm font-bold transition-colors relative cursor-pointer ${
              activeTab === 'specs'
                ? 'text-[#0066cc]'
                : 'text-neutral-600 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            Thông số kỹ thuật
            {activeTab === 'specs' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0066cc] rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={`py-2.5 text-sm font-bold transition-colors relative cursor-pointer tabular-nums ${
              activeTab === 'reviews'
                ? 'text-[#0066cc]'
                : 'text-neutral-600 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            Đánh giá & Nhận xét ({product.ratingCount || 0})
            {activeTab === 'reviews' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0066cc] rounded-full" />
            )}
          </button>
        </div>

        {activeTab === 'specs' && (
          <ProductSpecs specs={product.specs} brand={product.brand} />
        )}

        {activeTab === 'reviews' && (
          <ProductReviews
            productId={product._id}
            ratingAvg={product.ratingAvg}
            ratingCount={product.ratingCount}
            onReviewChange={() => loadProduct(true)}
          />
        )}
      </div>
    </div>
  );
}
