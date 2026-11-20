'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Filter, 
  X, 
  ChevronDown, 
  Search, 
  RotateCcw,
  Smartphone,
  Laptop,
  Tv,
  Watch,
  Headphones,
  SlidersHorizontal
} from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';
import api from '@/lib/api';

const PRICE_RANGES = [
  { label: 'Tất cả mức giá', min: '', max: '' },
  { label: 'Dưới 5 triệu', min: '0', max: '5000000' },
  { label: 'Từ 5 - 15 triệu', min: '5000000', max: '15000000' },
  { label: 'Từ 15 - 30 triệu', min: '15000000', max: '30000000' },
  { label: 'Trên 30 triệu', min: '30000000', max: '' },
];

const SORT_OPTIONS = [
  { label: 'Theo khuyến nghị', value: '' },
  { label: 'Giá: Thấp đến Cao', value: 'price' },
  { label: 'Giá: Cao đến Thấp', value: '-price' },
  { label: 'Đánh giá cao nhất', value: '-ratingAvg' },
  { label: 'Mới nhất', value: '-createdAt' },
];

const QUICK_CATEGORIES = [
  { label: 'Tất cả', slug: '', icon: SlidersHorizontal },
  { label: 'Điện thoại', slug: 'dien-thoai', icon: Smartphone },
  { label: 'Laptop & Tablet', slug: 'laptop', icon: Laptop },
  { label: 'TV & AV', slug: 'tv-av', icon: Tv },
  { label: 'Thiết bị đeo', slug: 'thiet-bi-deo', icon: Watch },
  { label: 'Phụ kiện', slug: 'phu-kien', icon: Headphones },
];

function CatalogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State from URL params
  const currentQuery = searchParams.get('q') || '';
  const currentCategory = searchParams.get('category') || '';
  const currentBrand = searchParams.get('brand') || '';
  const currentMinPrice = searchParams.get('minPrice') || '';
  const currentMaxPrice = searchParams.get('maxPrice') || '';
  const currentSort = searchParams.get('sort') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Metadata for filter dropdowns
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState(['Samsung', 'Apple', 'Xiaomi', 'Sony', 'Asus']);

  // Fetch filter options (categories & brands)
  useEffect(() => {
    async function loadFilterData() {
      try {
        const catRes = await api.get('/api/categories');
        if (Array.isArray(catRes)) setCategories(catRes);
        const brandRes = await api.get('/api/brands');
        if (Array.isArray(brandRes) && brandRes.length > 0) setBrands(brandRes);
      } catch (err) {
        // Use default fallback lists
      }
    }
    loadFilterData();
  }, []);

  // Update URL helper
  const updateFilters = (newParams) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, val]) => {
      if (val === '' || val === null || val === undefined) {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });
    // Reset to page 1 when changing filters (except when changing page itself)
    if (!newParams.page) {
      params.delete('page');
    }
    router.push(`/products?${params.toString()}`);
  };

  // Fetch products based on active params
  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      try {
        const queryStr = searchParams.toString();
        const res = await api.get(`/api/products?${queryStr}`);
        if (res) {
          setProducts(res.products || []);
          setTotal(res.total || 0);
          setTotalPages(res.totalPages || 1);
        }
      } catch (err) {
        setProducts([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [searchParams]);

  const hasActiveFilters = Boolean(
    currentQuery || currentCategory || currentBrand || currentMinPrice || currentMaxPrice || currentSort
  );

  const resetAllFilters = () => {
    router.push('/products');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* 1. Category Title & Quick Category Pill Selector */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white mb-6">
          {currentQuery ? `Kết quả tìm kiếm cho "${currentQuery}"` : 'Danh Sách Sản Phẩm Công Nghệ'}
        </h1>

        {/* Quick Horizontal Category Selectors */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {QUICK_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = currentCategory === cat.slug;
            return (
              <button
                key={cat.slug}
                onClick={() => updateFilters({ category: cat.slug })}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all shrink-0 border ${
                  isSelected
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white shadow-sm'
                    : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 hover:bg-neutral-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Smart Horizontal Filter Bar */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          {/* Left: Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Brand Filter */}
            <div className="relative">
              <select
                value={currentBrand}
                onChange={(e) => updateFilters({ brand: e.target.value })}
                className="appearance-none pl-3.5 pr-8 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-full text-xs font-semibold text-neutral-800 dark:text-neutral-200 border-none focus:ring-2 focus:ring-brand-blue cursor-pointer"
              >
                <option value="">Hãng sản xuất</option>
                {brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Price Range Filter */}
            <div className="relative">
              <select
                value={currentMinPrice || currentMaxPrice ? `${currentMinPrice}-${currentMaxPrice}` : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) {
                    updateFilters({ minPrice: '', maxPrice: '' });
                  } else {
                    const [min, max] = val.split('-');
                    updateFilters({ minPrice: min, maxPrice: max });
                  }
                }}
                className="appearance-none pl-3.5 pr-8 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-full text-xs font-semibold text-neutral-800 dark:text-neutral-200 border-none focus:ring-2 focus:ring-brand-blue cursor-pointer"
              >
                {PRICE_RANGES.map((rng, idx) => (
                  <option key={idx} value={rng.min || rng.max ? `${rng.min}-${rng.max}` : ''}>
                    {rng.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Clear All Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={resetAllFilters}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 rounded-full transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Xóa tất cả
              </button>
            )}
          </div>

          {/* Right: Results Count & Sort Dropdown */}
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-xs font-medium text-neutral-500">
              {loading ? 'Đang tải...' : `${total} Kết quả`}
            </span>

            <div className="relative">
              <select
                value={currentSort}
                onChange={(e) => updateFilters({ sort: e.target.value })}
                className="appearance-none pl-3.5 pr-8 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-full text-xs font-semibold text-neutral-800 dark:text-neutral-200 border-none focus:ring-2 focus:ring-brand-blue cursor-pointer"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Active Filter Tags */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-3 mt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs">
            <span className="text-neutral-400 text-[11px]">Đang lọc:</span>
            {currentBrand && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-medium text-[11px]">
                Hãng: {currentBrand}
                <X className="w-3 h-3 cursor-pointer" onClick={() => updateFilters({ brand: '' })} />
              </span>
            )}
            {currentCategory && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-medium text-[11px]">
                Danh mục: {currentCategory}
                <X className="w-3 h-3 cursor-pointer" onClick={() => updateFilters({ category: '' })} />
              </span>
            )}
            {(currentMinPrice || currentMaxPrice) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-medium text-[11px]">
                Mức giá đã chọn
                <X className="w-3 h-3 cursor-pointer" onClick={() => updateFilters({ minPrice: '', maxPrice: '' })} />
              </span>
            )}
            {currentQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-medium text-[11px]">
                Tìm: "{currentQuery}"
                <X className="w-3 h-3 cursor-pointer" onClick={() => updateFilters({ q: '' })} />
              </span>
            )}
          </div>
        )}
      </div>

      {/* 3. Products Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-96 rounded-3xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
          ))}
        </div>
      ) : products.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((item) => (
              <ProductCard key={item._id} product={item} />
            ))}
          </div>

          {/* 4. Pagination */}
          {totalPages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => updateFilters({ page: currentPage - 1 })}
                className="px-4 py-2 rounded-full border border-neutral-200 dark:border-neutral-800 text-xs font-semibold disabled:opacity-40 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Trước
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  onClick={() => updateFilters({ page: pg })}
                  className={`w-9 h-9 rounded-full text-xs font-bold transition-all ${
                    currentPage === pg
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm'
                      : 'border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100'
                  }`}
                >
                  {pg}
                </button>
              ))}

              <button
                disabled={currentPage >= totalPages}
                onClick={() => updateFilters({ page: currentPage + 1 })}
                className="px-4 py-2 rounded-full border border-neutral-200 dark:border-neutral-800 text-xs font-semibold disabled:opacity-40 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Sau
              </button>
            </div>
          )}
        </>
      ) : (
        /* Empty State */
        <div className="text-center py-20 p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
          <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-4 text-neutral-400">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-1">
            Không tìm thấy sản phẩm phù hợp
          </h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto mb-6">
            Hãy thử tìm với từ khóa khác hoặc xóa bớt các điều kiện lọc để hiển thị nhiều sản phẩm hơn.
          </p>
          <button
            onClick={resetAllFilters}
            className="px-6 py-2.5 rounded-full bg-brand-blue hover:bg-brand-blue-hover text-white text-xs font-bold transition-colors"
          >
            Đặt lại tất cả bộ lọc
          </button>
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-6 py-12 text-center text-sm">Đang tải danh mục...</div>}>
      <CatalogContent />
    </Suspense>
  );
}
