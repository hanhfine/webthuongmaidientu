'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import TabbedShowcase from '@/components/home/TabbedShowcase';
import ShopPerks from '@/components/shop/ShopPerks';
import LatestDeals from '@/components/shop/LatestDeals';
import ShopRecommended from '@/components/shop/ShopRecommended';
import CategoryProductView from '@/components/shop/CategoryProductView';
import api from '@/lib/api';

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
    // Reset to page 1 when changing filters
    if (!newParams.page) {
      params.delete('page');
    }
    router.push(`/products?${params.toString()}`);
  };

  const resetAllFilters = () => {
    if (currentCategory) {
      router.push(`/products?category=${currentCategory}`);
    } else {
      router.push('/products');
    }
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

  // Is this the Storefront Showroom mode (No category and no search) or Category specific mode?
  const isStorefrontMode = !currentCategory && !currentQuery;

  return (
    <div className={isStorefrontMode ? "max-w-7xl mx-auto px-4 sm:px-6 py-8" : "bg-[#1c1c1e] min-h-screen py-8 -my-8"}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {isStorefrontMode ? (
          /* MODE 1: TRANG CỬA HÀNG (Ảnh 3 - Showroom Flagship) */
          <div className="space-y-12">
            {/* 1. Lựa chọn tối ưu chuẩn sống của bạn (TabbedShowcase) */}
            <TabbedShowcase />

            {/* 2. Mua trực tiếp Nhận ngay ưu đãi (ShopPerks - 4 cards theo Ảnh 3) */}
            <ShopPerks />

            {/* 3. Ưu đãi mới nhất (LatestDeals - 4 thẻ chuẩn hóa cân đối) */}
            <LatestDeals />

            {/* 4. Được đề xuất cho bạn (ShopRecommended - Grid sản phẩm bán chạy theo Ảnh 3) */}
            <ShopRecommended />
          </div>
        ) : (
          /* MODE 2: CÁC TRANG DANH MỤC CHUYÊN SÂU (TopZone Style theo Ảnh 2) */
          <CategoryProductView
            categorySlug={currentCategory}
            products={products}
            total={total}
            currentSort={currentSort}
            currentBrand={currentBrand}
            currentMinPrice={currentMinPrice}
            currentMaxPrice={currentMaxPrice}
            updateFilters={updateFilters}
            resetFilters={resetAllFilters}
          />
        )}
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 rounded-full border-2 border-brand-blue border-t-transparent animate-spin" />
        </div>
      }
    >
      <CatalogContent />
    </Suspense>
  );
}
