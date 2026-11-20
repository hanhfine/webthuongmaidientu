'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, ChevronRight } from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';
import api from '@/lib/api';

export default function ShopRecommended() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRecommended() {
      try {
        const res = await api.get('/api/products?sort=-ratingAvg&page=1');
        if (res?.products && res.products.length > 0) {
          setProducts(res.products.slice(0, 4));
        }
      } catch (err) {
        // Fallback
      } finally {
        setLoading(false);
      }
    }
    loadRecommended();
  }, []);

  return (
    <section className="py-12 border-t border-neutral-200/80 dark:border-neutral-800">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
            Được đề xuất cho bạn
            <Sparkles className="w-5 h-5 text-amber-500" />
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-neutral-500">
            Dựa trên các sản phẩm công nghệ bán chạy và được đánh giá cao nhất
          </p>
        </div>

        <Link
          href="/products?category=dien-thoai"
          className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold px-4 py-2 rounded-full border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          Xem tất cả
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-96 rounded-3xl bg-neutral-100 dark:bg-neutral-800 animate-pulse p-6"
            />
          ))
        ) : products.length > 0 ? (
          products.map((item) => (
            <ProductCard key={item._id} product={item} />
          ))
        ) : null}
      </div>
    </section>
  );
}
