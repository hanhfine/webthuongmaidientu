'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Star, ShoppingBag, Eye } from 'lucide-react';
import { formatVND } from '@/lib/format';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';

// Sample color swatches palette if not specified in product specs
const DEFAULT_COLORS = [
  { name: 'Xanh Titan', hex: '#4B6B94' },
  { name: 'Đen Phantom', hex: '#1C1C1E' },
  { name: 'Trắng Bạc', hex: '#E5E5EA' },
  { name: 'Vàng Amber', hex: '#E5C07B' },
];

const DEFAULT_STORAGES = ['256GB', '512GB', '1TB'];

export default function ProductCard({ product, showStorage = true, showColors = true }) {
  const { addToCart } = useCart();
  const toast = useToast();
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLORS[0]);
  const [selectedStorage, setSelectedStorage] = useState(DEFAULT_STORAGES[0]);
  const [adding, setAdding] = useState(false);

  if (!product) return null;

  // Determine image source
  const imageUrl = product.imageId
    ? `/api/images/${product.imageId}`
    : product.image || 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=500&q=80';

  const productUrl = `/products/${product.slug || product._id}`;

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setAdding(true);
      await addToCart(product._id, 1);
      toast.success(`Đã thêm "${product.name}" vào giỏ hàng!`);
    } catch (err) {
      toast.error(err.message || 'Chưa thể thêm vào giỏ hàng');
    } finally {
      setAdding(false);
    }
  };

  // Estimate monthly installment (over 12 months)
  const installmentPerMonth = Math.round((product.price || 0) / 12);

  return (
    <div className="group relative flex flex-col justify-between p-5 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 hover:border-neutral-200 dark:hover:border-neutral-700 shadow-sm hover:shadow-xl transition-all duration-300">
      
      {/* Top Details & Wishlist/Tag */}
      <div>
        <div className="flex items-center justify-between mb-3">
          {product.brand && (
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              {product.brand}
            </span>
          )}
          {product.stock <= 5 && product.stock > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              Sắp hết hàng
            </span>
          )}
          {product.stock === 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-neutral-500">
              Tạm hết hàng
            </span>
          )}
        </div>

        {/* Product Image Thumbnail */}
        <Link href={productUrl} className="relative block w-full aspect-square mb-4 overflow-hidden rounded-2xl bg-neutral-50 dark:bg-neutral-800/50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
          />
        </Link>

        {/* Title */}
        <Link href={productUrl} className="block group-hover:text-brand-blue transition-colors">
          <h3 className="text-base font-bold text-neutral-900 dark:text-white line-clamp-1">
            {product.name}
          </h3>
        </Link>

        {/* Ratings */}
        <div className="flex items-center gap-1.5 mt-1.5 mb-3">
          <div className="flex items-center text-amber-400">
            <Star className="w-3.5 h-3.5 fill-current" />
          </div>
          <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
            {product.ratingAvg ? product.ratingAvg.toFixed(1) : '4.8'}
          </span>
          <span className="text-xs text-neutral-400">
            ({product.ratingCount || 120})
          </span>
        </div>

        {/* Color Swatches Dots */}
        {showColors && (
          <div className="flex items-center gap-2 mb-3">
            {DEFAULT_COLORS.map((col, idx) => {
              const isSelected = selectedColor.name === col.name;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedColor(col);
                  }}
                  title={col.name}
                  className={`w-4 h-4 rounded-full border transition-all ${
                    isSelected
                      ? 'ring-2 ring-brand-blue ring-offset-2 border-white scale-110'
                      : 'border-black/10 hover:scale-110'
                  }`}
                  style={{ backgroundColor: col.hex }}
                />
              );
            })}
            <span className="text-[11px] text-neutral-500 ml-1 truncate">
              {selectedColor.name}
            </span>
          </div>
        )}

        {/* Storage Capacity Selector Pills */}
        {showStorage && (
          <div className="flex items-center gap-1.5 mb-4">
            {DEFAULT_STORAGES.map((storage, idx) => {
              const isSelected = selectedStorage === storage;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedStorage(storage);
                  }}
                  className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                      : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 hover:bg-neutral-200'
                  }`}
                >
                  {storage}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Pricing & CTA Buttons */}
      <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800">
        <div className="mb-3">
          <p className="text-xs text-neutral-400">
            Từ {formatVND(installmentPerMonth)}/tháng
          </p>
          <p className="text-lg font-black text-neutral-900 dark:text-white">
            {formatVND(product.price)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={adding || product.stock === 0}
            className="w-full py-2 px-3 rounded-full bg-brand-blue hover:bg-brand-blue-hover text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm hover:shadow disabled:opacity-50"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            {adding ? '...' : 'Mua Ngay'}
          </button>

          <Link
            href={productUrl}
            className="w-full py-2 px-3 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold transition-all flex items-center justify-center gap-1"
          >
            <Eye className="w-3.5 h-3.5" />
            Chi Tiết
          </Link>
        </div>
      </div>
    </div>
  );
}
