'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Smartphone, 
  Laptop, 
  Headphones, 
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';
import api from '@/lib/api';

const SHOWCASE_TABS = [
  { id: 'all', label: 'Tất cả sản phẩm', icon: Sparkles },
  { id: 'dien-thoai', label: 'Điện thoại', icon: Smartphone },
  { id: 'laptop', label: 'Laptop & Máy tính', icon: Laptop },
  { id: 'phu-kien', label: 'Phụ kiện công nghệ', icon: Headphones },
];

const SORT_OPTIONS = [
  { label: 'Mới nhất', value: 'newest' },
  { label: 'Nổi bật', value: 'rating' },
  { label: 'Giá tăng dần', value: 'price_asc' },
  { label: 'Giá giảm dần', value: 'price_desc' },
];

export default function TabbedShowcase() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch real products from MongoDB backend by active tab, sort & page
  useEffect(() => {
    async function loadTabProducts() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (activeTab !== 'all') params.set('category', activeTab);
        if (sortBy) params.set('sort', sortBy);
        params.set('page', String(page));
        params.set('pageSize', '12');

        const res = await api.get(`/api/products?${params.toString()}`);
        const list = res?.products || res?.items || (Array.isArray(res) ? res : []);
        setProducts(list);
        setTotal(res?.total ?? list.length);
        setTotalPages(res?.totalPages || 1);
      } catch (err) {
        setProducts([]);
        setTotal(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    }

    loadTabProducts();
  }, [activeTab, sortBy, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = searchInput.trim();
    if (!q) return;
    router.push(`/products?q=${encodeURIComponent(q)}`);
  };

  return (
    <section className="py-10 sm:py-12 px-0 sm:px-0 max-w-7xl mx-auto">
      {/* Title */}
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white text-balance">
          Lựa chọn tối ưu chuẩn sống của bạn
        </h2>
        <p className="mt-2 text-sm sm:text-base text-neutral-600 max-w-2xl mx-auto text-pretty">
          Khám phá trọn bộ công nghệ từ thiết bị di động, laptop làm việc cho tới phụ kiện cao cấp chính hãng.
        </p>
      </div>

      {/* Always-Visible Storefront Search Bar */}
      <form onSubmit={handleSearchSubmit} className="max-w-xl mx-auto mb-6">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-neutral-500 absolute left-4 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm điện thoại, laptop, phụ kiện..."
            aria-label="Tìm kiếm sản phẩm trên cửa hàng"
            className="w-full pl-11 pr-28 py-3 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs sm:text-sm text-neutral-900 dark:text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-blue shadow-sm"
          />
          <button
            type="submit"
            className="absolute right-1.5 px-4 py-2 rounded-full bg-brand-blue hover:bg-brand-blue-hover text-white text-xs font-bold transition-colors whitespace-nowrap cursor-pointer"
          >
            Tìm kiếm
          </button>
        </div>
      </form>

      {/* Horizontal Tabs with Icons */}
      <div className="mb-6">
        <div className="flex items-center justify-start md:flex-wrap md:justify-center overflow-x-auto md:overflow-visible pb-3 md:pb-0 pr-8 md:pr-0 gap-2 sm:gap-3 no-scrollbar [mask-image:linear-gradient(to_right,black_calc(100%-32px),transparent)] md:[mask-image:none]">
          {SHOWCASE_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setPage(1);
                }}
                className={`flex items-center gap-1.5 lg:gap-2 px-3 py-2 lg:px-4 lg:py-2.5 rounded-full text-xs lg:text-sm font-semibold transition-colors shrink-0 duration-200 border cursor-pointer ${
                  isActive
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 border-neutral-900 dark:border-white shadow-md'
                    : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200/80 dark:border-neutral-800 hover:bg-neutral-200/80 hover:border-neutral-300 dark:hover:border-neutral-700'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Sort, Product Count & Advanced Filter Link */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-3 border-b border-neutral-200/80 dark:border-neutral-800 text-xs">
        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto pr-6 sm:pr-0 no-scrollbar [mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent)] sm:[mask-image:none]">
          {SORT_OPTIONS.map((opt) => {
            const activeSort = sortBy === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setSortBy(opt.value);
                  setPage(1);
                }}
                className={`py-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  activeSort
                    ? 'font-bold text-neutral-950 dark:text-white underline underline-offset-4 decoration-2 decoration-brand-blue'
                    : 'font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-auto">
          <span className="text-neutral-600 dark:text-neutral-400 font-semibold tabular-nums">
            {total} sản phẩm
          </span>
          <Link
            href={activeTab === 'all' ? '/products?sort=newest' : `/products?category=${activeTab}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 font-semibold hover:bg-neutral-200/70 transition-colors whitespace-nowrap"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Bộ lọc nâng cao</span>
          </Link>
        </div>
      </div>

      {/* Products Grid */}
      <div className="relative">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-80 sm:h-96 rounded-2xl bg-neutral-100 dark:bg-neutral-800 animate-pulse"
              />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center text-sm text-neutral-600">
            Chưa có sản phẩm nào trong danh mục này.
          </div>
        ) : (
          <>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeTab}-${sortBy}-${page}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4"
              >
                {products.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </motion.div>
            </AnimatePresence>

            {totalPages > 1 && (
              <div className="mt-8 pt-6 border-t border-neutral-200/80 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-4 text-xs">
                <span className="text-neutral-600 dark:text-neutral-400 font-medium tabular-nums">
                  Trang {page} / {totalPages} • Tổng {total} sản phẩm
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-neutral-200 bg-white font-semibold text-neutral-700 hover:bg-neutral-200/70 whitespace-nowrap shrink-0 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Trước
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .slice(Math.max(0, page - 2), Math.min(totalPages, page + 3))
                    .map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setPage(num)}
                        className={`w-8 h-8 rounded-xl font-bold transition-colors shrink-0 cursor-pointer tabular-nums ${
                          page === num
                            ? 'bg-neutral-900 text-white'
                            : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-200/70'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-neutral-200 bg-white font-semibold text-neutral-700 hover:bg-neutral-200/70 whitespace-nowrap shrink-0 disabled:opacity-40 cursor-pointer"
                  >
                    Sau
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}