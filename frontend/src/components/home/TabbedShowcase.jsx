'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Smartphone, 
  Tv, 
  Home, 
  Laptop, 
  Watch, 
  Headphones, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';
import api from '@/lib/api';

const SHOWCASE_TABS = [
  { id: 'featured', label: 'Mới & Nổi bật', icon: Sparkles },
  { id: 'dien-thoai', label: 'Di động', icon: Smartphone },
  { id: 'tv-av', label: 'TV & AV', icon: Tv },
  { id: 'gia-dung', label: 'Gia Dụng', icon: Home },
  { id: 'laptop', label: 'IT & Laptop', icon: Laptop },
  { id: 'thiet-bi-deo', label: 'Thiết bị đeo', icon: Watch },
  { id: 'phu-kien', label: 'Phụ kiện', icon: Headphones },
];

// Fallback high quality items if backend has not been populated yet
const FALLBACK_PRODUCTS = {
  featured: [
    {
      _id: 'sample-1',
      name: 'Galaxy Z Fold8 Ultra 5G',
      brand: 'Samsung',
      price: 52990000,
      stock: 15,
      ratingAvg: 4.9,
      ratingCount: 240,
      image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=500&q=80',
    },
    {
      _id: 'sample-2',
      name: 'Galaxy Z Flip8 Bespoke Edition',
      brand: 'Samsung',
      price: 31990000,
      stock: 20,
      ratingAvg: 4.8,
      ratingCount: 180,
      image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=500&q=80',
    },
    {
      _id: 'sample-3',
      name: 'Galaxy S26 Ultra AI 512GB',
      brand: 'Samsung',
      price: 38990000,
      stock: 25,
      ratingAvg: 5.0,
      ratingCount: 420,
      image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=500&q=80',
    },
    {
      _id: 'sample-4',
      name: 'Galaxy S26 FE Snapdragon Edition',
      brand: 'Samsung',
      price: 18990000,
      stock: 30,
      ratingAvg: 4.7,
      ratingCount: 95,
      image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&q=80',
    },
  ],
  'dien-thoai': [
    {
      _id: 'sample-phone-1',
      name: 'iPhone 18 Pro Max 256GB Titanium',
      brand: 'Apple',
      price: 41990000,
      stock: 18,
      ratingAvg: 4.9,
      ratingCount: 520,
      image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=500&q=80',
    },
    {
      _id: 'sample-phone-2',
      name: 'Galaxy S26 Plus 256GB',
      brand: 'Samsung',
      price: 26490000,
      stock: 22,
      ratingAvg: 4.8,
      ratingCount: 140,
      image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=500&q=80',
    },
    {
      _id: 'sample-phone-3',
      name: 'Galaxy A56 5G Chống Nước',
      brand: 'Samsung',
      price: 9490000,
      stock: 45,
      ratingAvg: 4.6,
      ratingCount: 88,
      image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=500&q=80',
    },
  ],
  'tv-av': [
    {
      _id: 'sample-tv-1',
      name: 'Smart TV Neo QLED 4K 65 inch',
      brand: 'Samsung',
      price: 36900000,
      stock: 10,
      ratingAvg: 4.9,
      ratingCount: 75,
      image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500&q=80',
    },
    {
      _id: 'sample-tv-2',
      name: 'The Frame TV Khung Tranh 55 inch',
      brand: 'Samsung',
      price: 24900000,
      stock: 8,
      ratingAvg: 4.8,
      ratingCount: 62,
      image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500&q=80',
    },
  ],
  'gia-dung': [
    {
      _id: 'sample-home-1',
      name: 'Máy Giặt Thông Minh AI EcoBubble 12kg',
      brand: 'Samsung',
      price: 14990000,
      stock: 12,
      ratingAvg: 4.7,
      ratingCount: 40,
      image: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=500&q=80',
    },
  ],
  laptop: [
    {
      _id: 'sample-lap-1',
      name: 'MacBook Pro 16 M4 Max 36GB',
      brand: 'Apple',
      price: 64990000,
      stock: 6,
      ratingAvg: 5.0,
      ratingCount: 92,
      image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&q=80',
    },
    {
      _id: 'sample-lap-2',
      name: 'Galaxy Tab S12 Ultra 512GB kèm Spen',
      brand: 'Samsung',
      price: 33990000,
      stock: 14,
      ratingAvg: 4.8,
      ratingCount: 110,
      image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500&q=80',
    },
  ],
  'thiet-bi-deo': [
    {
      _id: 'sample-wear-1',
      name: 'Galaxy Watch Ultra Titanium 47mm',
      brand: 'Samsung',
      price: 16990000,
      stock: 25,
      ratingAvg: 4.9,
      ratingCount: 165,
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80',
    },
    {
      _id: 'sample-wear-2',
      name: 'Galaxy Buds3 Pro Chống Ồn Chủ Động',
      brand: 'Samsung',
      price: 5490000,
      stock: 50,
      ratingAvg: 4.8,
      ratingCount: 310,
      image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&q=80',
    },
  ],
  'phu-kien': [
    {
      _id: 'sample-acc-1',
      name: 'Củ Sạc Nhanh GaN 65W 3 Cổng',
      brand: 'Samsung',
      price: 1290000,
      stock: 100,
      ratingAvg: 4.9,
      ratingCount: 450,
      image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=500&q=80',
    },
  ],
};

export default function TabbedShowcase() {
  const [activeTab, setActiveTab] = useState('featured');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch products from backend or use fallback for that category
  useEffect(() => {
    async function loadTabProducts() {
      setLoading(true);
      try {
        const query = activeTab === 'featured' ? '' : `?category=${activeTab}`;
        const res = await api.get(`/api/products${query}`);
        if (res?.products && res.products.length > 0) {
          setProducts(res.products);
        } else {
          // Fallback to sample items for that category
          setProducts(FALLBACK_PRODUCTS[activeTab] || FALLBACK_PRODUCTS.featured);
        }
      } catch (err) {
        // Fallback gracefully on network error or empty DB
        setProducts(FALLBACK_PRODUCTS[activeTab] || FALLBACK_PRODUCTS.featured);
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
          Khám phá trọn bộ công nghệ từ thiết bị di động, nghe nhìn cho tới phong cách sống hiện đại.
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
              className={`flex flex-col items-center justify-center min-w-[90px] sm:min-w-[105px] py-3.5 px-3 rounded-2xl border transition-all duration-200 shrink-0 ${
                isActive
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 border-transparent shadow-lg scale-105'
                  : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:text-neutral-900'
              }`}
            >
              <Icon className={`w-5 h-5 mb-1.5 ${isActive ? 'text-brand-blue' : ''}`} />
              <span className="text-xs font-semibold whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Dynamic Products Grid with Zero-reload Framer Motion Animation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {loading ? (
            // Skeleton Loading State
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
          ) : (
            <div className="col-span-full py-12 text-center text-neutral-400">
              Chưa có sản phẩm nào trong danh mục này.
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
