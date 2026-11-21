'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Trash2, Plus, Minus, AlertTriangle } from 'lucide-react';
import { formatVND } from '@/lib/format';
import { resolveProductImage } from '@/lib/productImage';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';

export default function CartItemRow({ item }) {
  const { updateQuantity, removeFromCart } = useCart();
  const toast = useToast();
  const [updating, setUpdating] = useState(false);

  const handleStep = async (newQty) => {
    if (newQty < 1) {
      handleRemove();
      return;
    }
    try {
      setUpdating(true);
      await updateQuantity(item.productId, newQty);
    } catch (err) {
      toast.error(err.message || 'Không thể cập nhật số lượng');
    } finally {
      setUpdating(false);
    }
  };

  const handleRemove = async () => {
    try {
      setUpdating(true);
      await removeFromCart(item.productId);
      toast.info(`Đã xóa "${item.name}" khỏi giỏ hàng.`);
    } catch (err) {
      toast.error(err.message || 'Không thể xóa sản phẩm');
    } finally {
      setUpdating(false);
    }
  };

  const imageUrl = resolveProductImage(item);
  const atMaxStock = !item.available || (typeof item.stock === 'number' && item.quantity >= item.stock);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm transition-all hover:shadow-md">
      
      {/* Product Image & Info */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-neutral-50 dark:bg-neutral-800/60 p-2 shrink-0 border border-neutral-100 dark:border-neutral-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={item.name}
            className="w-full h-full object-contain"
          />
        </div>

        <div className="min-w-0 space-y-1">
          <Link
            href={`/products/${item.slug || item.productId}`}
            className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white hover:text-brand-blue transition-colors line-clamp-1"
          >
            {item.name}
          </Link>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            Đơn giá: {formatVND(item.price)}
          </p>
          {!item.available && (
            <p className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              Sản phẩm tạm hết hoặc vượt quá số lượng trong kho
            </p>
          )}
        </div>
      </div>

      {/* Quantity Controls & Line Total */}
      <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-neutral-100 dark:border-neutral-800">
        
        {/* Quantity Stepper */}
        <div className="flex items-center rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 p-1">
          <button
            type="button"
            disabled={updating || item.quantity <= 1}
            onClick={() => handleStep(item.quantity - 1)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-700 disabled:opacity-30 transition-colors cursor-pointer"
            aria-label="Giảm số lượng"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          
          <span className="w-9 text-center text-xs font-bold text-neutral-900 dark:text-white">
            {item.quantity}
          </span>

          <button
            type="button"
            disabled={updating || atMaxStock}
            onClick={() => handleStep(item.quantity + 1)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-700 disabled:opacity-30 transition-colors cursor-pointer"
            aria-label="Tăng số lượng"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Total Price */}
        <div className="text-right min-w-[100px] tabular-nums">
          <span className="text-sm sm:text-base font-black text-neutral-900 dark:text-white whitespace-nowrap">
            {formatVND(item.available ? item.lineTotal : 0)}
          </span>
        </div>

        {/* Delete Button */}
        <button
          type="button"
          onClick={handleRemove}
          disabled={updating}
          className="p-2 rounded-xl text-neutral-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
          title="Xóa khỏi giỏ hàng"
          aria-label={`Xóa ${item.name} khỏi giỏ hàng`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
