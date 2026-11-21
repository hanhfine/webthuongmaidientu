'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Star, ShoppingBag, Eye } from 'lucide-react';
import { formatVND } from '@/lib/format';
import { resolveProductImage } from '@/lib/productImage';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';

export default function ProductCard({ product }) {
  const { isAdmin } = useAuth();
  const { addToCart } = useCart();
  const toast = useToast();
  const [adding, setAdding] = useState(false);

  if (!product) return null;

  const imageUrl = resolveProductImage(product);
  const productUrl = `/products/${product.slug || product._id}`;
  const isOutOfStock = (product.stock ?? 0) <= 0;
  const hasReviews = (product.ratingCount || 0) > 0;

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setAdding(true);
      await addToCart(product._id, 1, product);
      toast.success(`Đã thêm "${product.name}" vào giỏ hàng!`);
    } catch (err) {
      toast.error(err.message || 'Chưa thể thêm vào giỏ hàng');
    } finally {
      setAdding(false);
    }
  };

  const installmentPerMonth = Math.round((product.price || 0) / 12);

  return (
    <div className="group relative flex flex-col justify-between p-3 sm:p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors min-w-0">
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 mb-2 sm:mb-3 min-w-0">
          {product.brand ? (
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 truncate">
              {product.brand}
            </span>
          ) : (
            <span />
          )}
          {!isOutOfStock && product.stock <= 5 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-inset ring-black/5 whitespace-nowrap shrink-0">
              <span className="size-1.5 rounded-full bg-current" />
              Sắp hết hàng
            </span>
          )}
          {isOutOfStock && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 ring-1 ring-inset ring-black/5 whitespace-nowrap shrink-0">
              <span className="size-1.5 rounded-full bg-current" />
              Hết hàng
            </span>
          )}
        </div>

        {/* Product Image Thumbnail */}
        <Link href={productUrl} className="relative block w-full aspect-square mb-2.5 sm:mb-4 overflow-hidden rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-contain p-2 sm:p-4"
          />
        </Link>

        {/* Title */}
        <Link href={productUrl} className="block group-hover:text-brand-blue transition-colors">
          <h3 className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem] text-pretty">
            {product.name}
          </h3>
        </Link>

        {/* Ratings */}
        <div className="flex items-center gap-1 sm:gap-1.5 mt-1.5 sm:mt-2 mb-2 sm:mb-3 text-xs min-w-0">
          <Star className={`w-3.5 h-3.5 shrink-0 ${hasReviews ? 'text-amber-400 fill-current' : 'text-neutral-300 dark:text-neutral-700'}`} />
          {hasReviews ? (
            <>
              <span className="font-semibold text-neutral-800 dark:text-neutral-200 tabular-nums">
                {Number(product.ratingAvg).toFixed(1)}
              </span>
              <span className="text-neutral-600 tabular-nums truncate">
                ({product.ratingCount}<span className="hidden sm:inline"> đánh giá</span>)
              </span>
            </>
          ) : (
            <span className="text-neutral-600 truncate">Chưa có đánh giá</span>
          )}
        </div>
      </div>

      {/* Pricing & CTA Buttons */}
      <div className="pt-2.5 sm:pt-3 border-t border-neutral-100 dark:border-neutral-800 mt-auto">
        <div className="mb-2.5 sm:mb-3 tabular-nums">
          <p className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white whitespace-nowrap">
            {formatVND(product.price)}
          </p>
          <p className="text-xs text-neutral-600 truncate">
            Từ {formatVND(installmentPerMonth)}/tháng
          </p>
        </div>

        <div className={`grid grid-cols-1 ${isAdmin ? '' : 'sm:grid-cols-2'} gap-1.5 sm:gap-2`}>
          {!isAdmin && (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={adding || isOutOfStock}
              className="w-full py-2 px-2.5 rounded-xl bg-brand-blue hover:bg-brand-blue-hover text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap disabled:opacity-50 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
              {isOutOfStock ? 'Hết hàng' : adding ? '...' : 'Mua Ngay'}
            </button>
          )}

          <Link
            href={productUrl}
            className="w-full py-2 px-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 shrink-0" />
            Chi Tiết
          </Link>
        </div>
      </div>
    </div>
  );
}
