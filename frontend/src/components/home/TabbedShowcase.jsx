'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Smartphone, 
  Laptop, 
  Headphones, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';
import api from '@/lib/api';

const SHOWCASE_TABS = [
  { id: 'all', label: 'Tất cả sản phẩm', icon: Sparkles },
  { id: 'dien-thoai', label: 'Điện thoại', icon: Smartphone },
  { id: 'laptop', label: 'Laptop & Máy tính', icon: Laptop },
  { id: 'phu-kien', label: 'Phụ kiện công nghệ', icon: Headphones },
];

export default function TabbedShowcase() {
  const [activeTab, setActiveTab] = useState('all');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch real products from MongoDB backend by active tab
  useEffect(() => {
    async function loadTabProducts() {
      setLoading(true);
      try {
        const query = activeTab === 'all' ? '' : `?category=${activeTab}`;
        const res = await api.get(`/api/products${query}`);
        const list = res?.products || res?.items || (Array.isArray(res) ? res : []);
        setProducts(list);
      } catch (err) {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }

    loadTabProducts();
  }, [activeTab]);

  return (
    <section className="py-16 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="text-center mb-10">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
          Lựa chọn tối ưu chuẩn sống của bạn
        </h2>
        <p className="mt-2 text-sm sm:text-base text-neutral-500 max-w-2xl mx-auto">
          Khám phá trọn bộ công nghệ từ thiết bị di động, laptop làm việc cho tới phụ kiện cao cấp chính hãng.
        </p>
      </div>

      {/* Horizontal Tabs with Icons */}
      <div className="flex items-center justify-start sm:justify-center overflow-x-auto pb-4 gap-2 sm:gap-3 no-scrollbar mb-10">
        {SHOWCASE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all shrink-0 duration-200 border ${
                isActive
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 border-neutral-900 dark:border-white shadow-md'
                  : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Products Carousel / Grid */}
      <div className="relative">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-96 rounded-3xl bg-neutral-100 dark:bg-neutral-800 animate-pulse"
              />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center text-sm text-neutral-400">
            Chưa có sản phẩm nào trong danh mục này.
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </section>
  );
}