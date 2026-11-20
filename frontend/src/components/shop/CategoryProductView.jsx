'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  SlidersHorizontal,
  X,
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import { formatVND } from '@/lib/format';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';

// Multi-slide banners configured for each category
const CATEGORY_CONFIGS = {
  'dien-thoai': {
    categoryTitle: 'Điện Thoại & Smartphone Flagship',
    categorySubtitle: 'Các dòng iPhone, Galaxy, Xiaomi chính hãng VN/A mới nhất với ưu đãi trả chậm 0% và thu cũ đổi mới trợ giá cao',
    seriesPills: [
      { label: 'Tất cả', value: '' },
      { label: 'iPhone 16 Series', value: 'iPhone 16' },
      { label: 'iPhone 15 Series', value: 'iPhone 15' },
      { label: 'Galaxy S24 Series', value: 'Galaxy S24' },
      { label: 'Galaxy Z Fold & Flip', value: 'Galaxy Z' },
      { label: 'Xiaomi 14 Series', value: 'Xiaomi' },
    ],
    storageOptions: ['128GB', '256GB', '512GB', '1TB'],
    slides: [
      {
        id: 1,
        heroTitle: 'iPhone 16 Pro Max',
        heroTag: 'Sắm Như Ý. Trả Nhẹ Ví',
        heroImage: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=700&q=85',
        badges: ['Giá chỉ từ 28.990.000 ₫', 'Chỉ từ 59K/ngày', 'Trả góp 0% lãi suất'],
        subText: 'Tặng phiếu mua hàng đến 1.000.000 ₫ khi mua kèm phụ kiện • Thu cũ trợ giá đến 2.000.000 ₫',
        badgeBg: 'bg-rose-600',
      },
      {
        id: 2,
        heroTitle: 'Galaxy S24 Ultra AI',
        heroTag: 'Quyền Năng AI. Khai Phóng Vị Thế',
        heroImage: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=700&q=85',
        badges: ['Giảm ngay 4.500.000 ₫', 'Tặng gói Samsung Care+', 'Thu cũ trợ giá 3 Triệu'],
        subText: 'Tính năng Circle to Search thông minh vượt trội • Camera 200MP bắt trọn chi tiết sắc nét',
        badgeBg: 'bg-indigo-600',
      },
      {
        id: 3,
        heroTitle: 'Xiaomi 14 Series Leica',
        heroTag: 'Tuyệt Tác Ống Kính Thế Hệ Mới',
        heroImage: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=700&q=85',
        badges: ['Giảm sốc 2.000.000 ₫', 'Bảo hành chính hãng 24T', 'Trả góp 0% qua thẻ'],
        subText: 'Ống kính quang học Leica Summilux đỉnh cao • Vi xử lý Snapdragon 8 Gen 3 siêu mượt mà',
        badgeBg: 'bg-amber-600',
      },
    ],
  },
  laptop: {
    categoryTitle: 'Laptop & Máy Tính Bảng Cao Cấp',
    categorySubtitle: 'MacBook, Dell XPS, ASUS Zenbook, ThinkPad chính hãng phục vụ học tập, đồ họa và công việc đỉnh cao',
    seriesPills: [
      { label: 'Tất cả', value: '' },
      { label: 'MacBook Pro', value: 'MacBook Pro' },
      { label: 'MacBook Air', value: 'MacBook Air' },
      { label: 'Dell XPS', value: 'Dell' },
      { label: 'ASUS Gaming & Zenbook', value: 'ASUS' },
      { label: 'Lenovo ThinkPad', value: 'ThinkPad' },
    ],
    storageOptions: ['256GB SSD', '512GB SSD', '1TB SSD', '2TB SSD'],
    slides: [
      {
        id: 1,
        heroTitle: 'MacBook Pro M3 Max',
        heroTag: 'Quái Thú Đồ Họa. Pin 22 Giờ',
        heroImage: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=700&q=85',
        badges: ['Giảm ngay 4.000.000 ₫', 'Tặng Magic Mouse 2', 'Trả chậm 0% lãi suất'],
        subText: 'Màn hình Liquid Retina XDR cực đỉnh • Hiệu năng render đồ họa 3D nhanh gấp 2.5 lần',
        badgeBg: 'bg-sky-600',
      },
      {
        id: 2,
        heroTitle: 'Dell XPS 13 & 16',
        heroTag: 'Tuyệt Tác Viền Mỏng Vô Cực',
        heroImage: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=700&q=85',
        badges: ['Tặng Balo Dell Gaming', 'Giảm 10% cho HSSV', 'Bảo hành tận nơi 24/7'],
        subText: 'Màn hình OLED 4K InfinityEdge tuyệt đẹp • Trọng lượng siêu nhẹ chỉ 1.19kg',
        badgeBg: 'bg-emerald-600',
      },
    ],
  },
  'phu-kien': {
    categoryTitle: 'Phụ Kiện Công Nghệ & Âm Thanh',
    categorySubtitle: 'Hệ sinh thái tai nghe không dây, sạc nhanh GaN, bàn phím cơ và phụ kiện bảo vệ cao cấp',
    seriesPills: [
      { label: 'Tất cả', value: '' },
      { label: 'AirPods & Tai nghe', value: 'AirPods' },
      { label: 'Sạc cáp Anker GaN', value: 'Anker' },
      { label: 'Bàn phím cơ Keychron', value: 'Keychron' },
      { label: 'Chuột Logitech', value: 'Logitech' },
    ],
    storageOptions: [],
    slides: [
      {
        id: 1,
        heroTitle: 'AirPods Pro 2 USB-C',
        heroTag: 'Chủ Động Khử Ồn Gấp 2 Lần',
        heroImage: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=700&q=85',
        badges: ['Giảm 1.200.000 ₫ khi mua kèm máy', 'Khắc tên miễn phí', 'Đổi trả 30 ngày'],
        subText: 'Âm thanh không gian Spatial Audio sống động • Kháng bụi kháng nước chuẩn IP54',
        badgeBg: 'bg-indigo-600',
      },
      {
        id: 2,
        heroTitle: 'Bàn Phím Cơ Keychron K2 Pro',
        heroTag: 'Gõ Phím Êm Ái. Nâng Tầm Setup',
        heroImage: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=700&q=85',
        badges: ['Tặng bộ Keycap PBT cao cấp', 'Kết nối Bluetooth 5.1', 'Bảo hành 12T 1 đổi 1'],
        subText: 'Switch Gateron Pro tùy biến hot-swappable • Khung nhôm cao cấp hỗ trợ QMK/VIA',
        badgeBg: 'bg-amber-600',
      },
    ],
  },
};

// Valid backend sort query params
const SORT_ITEMS = [
  { label: 'Mới nhất', value: 'newest' },
  { label: 'Nổi bật & Đánh giá', value: 'rating' },
  { label: 'Giá tăng dần', value: 'price_asc' },
  { label: 'Giá giảm dần', value: 'price_desc' },
];

// Helper to resolve high-res product photos
const getProductImage = (product) => {
  if (product.images && product.images.length > 0 && product.images[0]) {
    return product.images[0];
  }
  const name = (product.name || '').toLowerCase();
  if (name.includes('iphone 15 pro') || name.includes('iphone 16 pro')) {
    return 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&q=80';
  }
  if (name.includes('iphone')) {
    return 'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=600&q=80';
  }
  if (name.includes('s24') || name.includes('samsung') || name.includes('galaxy')) {
    return 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&q=80';
  }
  if (name.includes('xiaomi')) {
    return 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&q=80';
  }
  if (name.includes('macbook')) {
    return 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80';
  }
  if (name.includes('laptop') || name.includes('dell') || name.includes('thinkpad')) {
    return 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=600&q=80';
  }
  if (name.includes('phím') || name.includes('keychron') || name.includes('keyboard')) {
    return 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&q=80';
  }
  if (name.includes('tai nghe') || name.includes('airpods') || name.includes('buds')) {
    return 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&q=80';
  }
  return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80';
};

export default function CategoryProductView({
  categorySlug,
  products = [],
  total = 0,
  currentSort = 'newest',
  currentBrand = '',
  currentMinPrice = '',
  currentMaxPrice = '',
  updateFilters,
  resetFilters,
}) {
  const router = useRouter();
  const { addToCart } = useCart();
  const toast = useToast();
  const [addingId, setAddingId] = useState(null);

  const config = CATEGORY_CONFIGS[categorySlug] || CATEGORY_CONFIGS['dien-thoai'];
  const slides = config.slides;

  // Banner carousel state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = next, -1 = prev
  const [isHovered, setIsHovered] = useState(false);

  // Filter states
  const [activeSeries, setActiveSeries] = useState('');
  const [selectedStorageMap, setSelectedStorageMap] = useState({});
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // Next / Previous slide navigation
  const nextSlide = useCallback(() => {
    setDirection(1);
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setDirection(-1);
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const goToSlide = (index) => {
    setDirection(index > currentSlide ? 1 : -1);
    setCurrentSlide(index);
  };

  // Auto-play carousel every 5s unless hovered
  useEffect(() => {
    if (isHovered || slides.length <= 1) return;
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [isHovered, nextSlide, slides.length]);

  // Filter products by selected series
  const displayedProducts = useMemo(() => {
    if (!activeSeries) return products;
    return products.filter((p) => {
      const matchName = (p.name || '').toLowerCase().includes(activeSeries.toLowerCase());
      const matchBrand = (p.brand || '').toLowerCase().includes(activeSeries.toLowerCase());
      return matchName || matchBrand;
    });
  }, [products, activeSeries]);

  const handleSelectStorage = (productId, storage) => {
    setSelectedStorageMap((prev) => ({ ...prev, [productId]: storage }));
  };

  const activeSlideData = slides[currentSlide] || slides[0];

  // Slide animation variants
  const slideVariants = {
    enter: (dir) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.45, ease: [0.25, 1, 0.5, 1] },
    },
    exit: (dir) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0,
      transition: { duration: 0.35, ease: [0.25, 1, 0.5, 1] },
    }),
  };

  return (
    <div className="space-y-8 text-neutral-900">
      {/* 1. Header Section: Title & Subtitle */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 flex items-center gap-2.5">
          <Sparkles className="w-6 h-6 text-brand-blue shrink-0" />
          {config.categoryTitle}
        </h1>
        <p className="text-sm text-neutral-500 max-w-3xl leading-relaxed">
          {config.categorySubtitle}
        </p>
      </div>

      {/* 2. Interactive Banner Carousel (Light Theme with Smooth Transitions) */}
      <div 
        className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-neutral-50 via-white to-neutral-100 border border-neutral-200/90 shadow-sm hover:shadow-md transition-shadow p-6 sm:p-10"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative min-h-[300px] sm:min-h-[260px] flex items-center">
          <AnimatePresence custom={direction} mode="wait">
            <motion.div
              key={activeSlideData.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-10 items-center w-full"
            >
              {/* Left Column: Product Name & High-res Cutout */}
              <div className="md:col-span-5 flex flex-col justify-center items-center md:items-start text-center md:text-left space-y-4">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-neutral-950">
                  {activeSlideData.heroTitle}
                </h2>
                <div className="relative w-full max-w-[280px] aspect-[4/3] flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeSlideData.heroImage}
                    alt={activeSlideData.heroTitle}
                    className="w-full h-full object-contain filter drop-shadow-xl hover:scale-105 transition-transform duration-500"
                  />
                </div>
              </div>

              {/* Right Column: Slogan & Promo Badges */}
              <div className="md:col-span-7 flex flex-col justify-center items-center md:items-end text-center md:text-right space-y-4">
                <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-rose-600 tracking-tight">
                  {activeSlideData.heroTag}
                </span>

                {/* Promo Badges (Pills) */}
                <div className="flex flex-wrap items-center justify-center md:justify-end gap-2.5 pt-1">
                  {activeSlideData.badges.map((badge, idx) => (
                    <span
                      key={idx}
                      className="px-3.5 py-1.5 rounded-full bg-rose-600 text-white text-xs sm:text-sm font-bold shadow-sm shadow-rose-600/30"
                    >
                      {badge}
                    </span>
                  ))}
                </div>

                <p className="text-xs sm:text-sm text-neutral-600 max-w-lg leading-relaxed pt-1">
                  {activeSlideData.subText}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Carousel Prev Button */}
        <button
          onClick={prevSlide}
          className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-neutral-800 shadow-md border border-neutral-200 flex items-center justify-center transition-all hover:scale-105 focus:outline-none"
          aria-label="Slide trước"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Carousel Next Button */}
        <button
          onClick={nextSlide}
          className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-neutral-800 shadow-md border border-neutral-200 flex items-center justify-center transition-all hover:scale-105 focus:outline-none"
          aria-label="Slide tiếp theo"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Pagination Dots (Clickable) */}
        <div className="flex items-center justify-center gap-2 pt-4">
          {slides.map((s, idx) => {
            const isActive = idx === currentSlide;
            return (
              <button
                key={s.id}
                onClick={() => goToSlide(idx)}
                className={`transition-all rounded-full h-2 ${
                  isActive 
                    ? 'w-7 bg-neutral-900' 
                    : 'w-2 bg-neutral-300 hover:bg-neutral-400'
                }`}
                aria-label={`Chuyển tới slide ${idx + 1}`}
              />
            );
          })}
        </div>
      </div>

      {/* 3. Horizontal Filter Bar: [ ∇ Bộ lọc ] + Series Pills (Light Theme) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {/* Toggle Filter Drawer Button */}
        <button
          onClick={() => setFilterDrawerOpen(!filterDrawerOpen)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 border shadow-sm ${
            filterDrawerOpen || currentMinPrice || currentMaxPrice || currentBrand
              ? 'bg-brand-blue text-white border-brand-blue'
              : 'bg-white text-neutral-800 border-neutral-300 hover:bg-neutral-50'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          Bộ lọc
          {(currentMinPrice || currentMaxPrice || currentBrand) && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          )}
        </button>

        {/* Series Pills (Tất cả, iPhone 16 Series, v.v.) */}
        {config.seriesPills.map((sp) => {
          const isSelected = activeSeries === sp.value;
          return (
            <button
              key={sp.label}
              onClick={() => setActiveSeries(isSelected && sp.value !== '' ? '' : sp.value)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all border shrink-0 ${
                isSelected
                  ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                  : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100 hover:border-neutral-300'
              }`}
            >
              {sp.label}
            </button>
          );
        })}
      </div>

      {/* 4. Collapsible Filter Drawer (Light Theme) */}
      {filterDrawerOpen && (
        <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200/90 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
            <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-brand-blue" />
              Lọc theo mức giá & thương hiệu
            </span>
            <button
              onClick={() => setFilterDrawerOpen(false)}
              className="text-neutral-400 hover:text-neutral-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Price Filter */}
            <div>
              <label className="text-[11px] font-semibold text-neutral-600 block mb-1.5">
                Khoảng giá
              </label>
              <select
                value={
                  currentMinPrice && currentMaxPrice
                    ? `${currentMinPrice}-${currentMaxPrice}`
                    : currentMinPrice
                    ? `${currentMinPrice}-`
                    : currentMaxPrice
                    ? `0-${currentMaxPrice}`
                    : ''
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) {
                    updateFilters({ minPrice: '', maxPrice: '' });
                  } else {
                    const [min, max] = val.split('-');
                    updateFilters({ minPrice: min, maxPrice: max });
                  }
                }}
                className="w-full bg-white text-xs font-semibold text-neutral-800 px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:ring-1 focus:ring-brand-blue"
              >
                <option value="">Tất cả mức giá</option>
                <option value="0-10000000">Dưới 10 Triệu</option>
                <option value="10000000-20000000">Từ 10 - 20 Triệu</option>
                <option value="20000000-30000000">Từ 20 - 30 Triệu</option>
                <option value="30000000-">Trên 30 Triệu</option>
              </select>
            </div>

            {/* Brand Filter */}
            <div>
              <label className="text-[11px] font-semibold text-neutral-600 block mb-1.5">
                Hãng sản xuất
              </label>
              <select
                value={currentBrand}
                onChange={(e) => updateFilters({ brand: e.target.value })}
                className="w-full bg-white text-xs font-semibold text-neutral-800 px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:ring-1 focus:ring-brand-blue"
              >
                <option value="">Tất cả thương hiệu</option>
                <option value="Apple">Apple</option>
                <option value="Samsung">Samsung</option>
                <option value="Xiaomi">Xiaomi</option>
                <option value="Dell">Dell</option>
                <option value="ASUS">ASUS</option>
                <option value="Lenovo">Lenovo</option>
                <option value="Keychron">Keychron</option>
                <option value="Anker">Anker</option>
                <option value="Logitech">Logitech</option>
              </select>
            </div>

            {/* Reset button */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setActiveSeries('');
                  resetFilters();
                  setFilterDrawerOpen(false);
                }}
                className="w-full py-2.5 px-4 bg-neutral-200 hover:bg-neutral-300 text-xs font-bold text-neutral-800 rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Đặt lại bộ lọc
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Sort Options Row: Mới nhất • Nổi bật • Giá tăng dần • Giá giảm dần */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs pt-2 border-b border-neutral-200 pb-3">
        <div className="flex items-center gap-3">
          <span className="text-neutral-500 font-semibold">Sắp xếp theo:</span>
          <div className="flex items-center gap-3 sm:gap-5 overflow-x-auto no-scrollbar">
            {SORT_ITEMS.map((item) => {
              const isActive = (currentSort || 'newest') === item.value;
              return (
                <button
                  key={item.label}
                  onClick={() => updateFilters({ sort: item.value })}
                  className={`font-semibold transition-colors ${
                    isActive
                      ? 'text-neutral-950 font-bold underline underline-offset-4 decoration-2 decoration-brand-blue'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <span className="text-neutral-500 font-semibold">
          {displayedProducts.length} sản phẩm
        </span>
      </div>

      {/* 6. Product Cards Grid (3 Columns, Light Theme, TopZone Form Layout) */}
      {displayedProducts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-neutral-200/80 p-8 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-neutral-800">
            Không tìm thấy sản phẩm nào
          </h3>
          <p className="text-xs text-neutral-500 max-w-md mx-auto">
            Không có sản phẩm nào phù hợp với bộ lọc hiện tại. Vui lòng chọn dòng sản phẩm khác hoặc đặt lại bộ lọc.
          </p>
          <button
            onClick={() => {
              setActiveSeries('');
              resetFilters();
            }}
            className="px-5 py-2.5 rounded-full bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition-colors inline-flex items-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Xem tất cả sản phẩm
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedProducts.map((p) => {
            const selectedStorage = selectedStorageMap[p._id] || (config.storageOptions[0] || '256GB');
            const monthlyEst = Math.round(p.price / 12);
            const imageUrl = getProductImage(p);

            return (
              <div
                key={p._id}
                className="p-6 rounded-3xl bg-white border border-neutral-200/80 shadow-sm hover:shadow-xl hover:border-neutral-300 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top: Orange 'Mới' Badge & Guarantee */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-amber-700 border border-amber-300 bg-amber-50">
                      Mới
                    </span>
                    <span className="text-[11px] text-neutral-500 font-medium">
                      Chính Hãng VN/A
                    </span>
                  </div>

                  {/* Product Cutout Image */}
                  <Link href={`/products/${p.slug}`} className="block relative aspect-square w-full mb-6 p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt={p.name}
                      className="w-full h-full object-contain filter drop-shadow-md group-hover:scale-105 transition-transform duration-300"
                    />
                  </Link>

                  {/* Storage Selector Pills (như TopZone layout) */}
                  {config.storageOptions.length > 0 && (
                    <div className="flex items-center justify-center gap-2 mb-5 overflow-x-auto no-scrollbar py-1">
                      {config.storageOptions.map((st) => {
                        const isChosen = selectedStorage === st;
                        return (
                          <button
                            key={st}
                            onClick={() => handleSelectStorage(p._id, st)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                              isChosen
                                ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                                : 'bg-neutral-100 text-neutral-700 border-neutral-200 hover:bg-neutral-200'
                            }`}
                          >
                            {st}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Product Name */}
                  <Link href={`/products/${p.slug}`}>
                    <h3 className="text-base sm:text-lg font-bold text-neutral-900 mb-2 leading-snug group-hover:text-brand-blue transition-colors line-clamp-2">
                      {p.name}
                    </h3>
                  </Link>

                  {/* Price & Monthly Installment */}
                  <div className="mb-4">
                    <p className="text-xl sm:text-2xl font-black text-neutral-950">
                      {formatVND(p.price)}
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5 font-medium">
                      Trả góp từ {formatVND(monthlyEst)}/tháng • 0% lãi suất
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-neutral-100 space-y-2.5">
                  <button
                    disabled={addingId === p._id}
                    onClick={async () => {
                      try {
                        setAddingId(p._id);
                        await addToCart(p._id, 1);
                        toast.success(`Đã thêm ${p.name} (${selectedStorage}) vào giỏ hàng!`);
                      } catch (err) {
                        toast.error(err.message || 'Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng');
                        if (err.message && err.message.toLowerCase().includes('đăng nhập')) {
                          setTimeout(() => {
                            router.push('/login');
                          }, 1200);
                        }
                      } finally {
                        setAddingId(null);
                      }
                    }}
                    className="w-full py-3 rounded-2xl bg-neutral-900 hover:bg-black text-white text-xs font-bold tracking-wide transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {addingId === p._id ? 'Đang thêm...' : 'Mua Ngay'}
                  </button>
                  <Link
                    href={`/products/${p.slug}`}
                    className="w-full py-2.5 rounded-2xl border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 text-neutral-700 hover:text-neutral-950 text-xs font-bold transition-all text-center block"
                  >
                    Xem Chi Tiết
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}