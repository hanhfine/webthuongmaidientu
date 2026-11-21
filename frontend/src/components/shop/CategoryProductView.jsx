'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Search,
  RotateCcw, 
  SlidersHorizontal,
  X,
  ShoppingBag
} from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';

// Multi-slide banners configured for each category
const CATEGORY_CONFIGS = {
  'dien-thoai': {
    categoryTitle: 'Điện Thoại & Smartphone Flagship',
    categorySubtitle: 'Các dòng iPhone, Galaxy, Xiaomi chính hãng VN/A mới nhất với ưu đãi trả chậm 0% và thu cũ đổi mới trợ giá cao',
    seriesPills: [
      { label: 'Tất cả', value: '' },
      { label: 'Apple iPhone', value: 'iPhone' },
      { label: 'Samsung Galaxy', value: 'Galaxy' },
      { label: 'Oppo Series', value: 'Oppo' },
      { label: 'Realme Series', value: 'Realme' },
      { label: 'Vivo Series', value: 'Vivo' },
    ],
    storageOptions: ['128GB', '256GB', '512GB', '1TB'],
    slides: [
      {
        id: 1,
        heroTitle: 'iPhone 15 Pro Max',
        heroTag: 'Sắm Như Ý. Trả Nhẹ Ví',
        heroImage: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=700&q=85',
        badges: ['Từ 28.99Tr', 'Chỉ từ 59K/ngày', 'Trả góp 0%'],
        subText: 'Tặng phiếu mua hàng đến 1.000.000 ₫ khi mua kèm phụ kiện • Thu cũ trợ giá đến 2.000.000 ₫',
        badgeBg: 'bg-rose-600',
      },
      {
        id: 2,
        heroTitle: 'Galaxy S24 Ultra AI',
        heroTag: 'Quyền Năng AI. Khai Phóng Vị Thế',
        heroImage: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=700&q=85',
        badges: ['Giảm 4.5Tr', 'Tặng Care+', 'Trợ giá 3Tr'],
        subText: 'Tính năng Circle to Search thông minh vượt trội • Camera 200MP bắt trọn chi tiết sắc nét',
        badgeBg: 'bg-indigo-600',
      },
      {
        id: 3,
        heroTitle: 'Xiaomi 14 Series Leica',
        heroTag: 'Tuyệt Tác Ống Kính Thế Hệ Mới',
        heroImage: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=700&q=85',
        badges: ['Giảm 2Tr', 'Bảo hành 24T', 'Trả góp 0%'],
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
      { label: 'MacBook Pro', value: 'MacBook' },
      { label: 'Dell XPS', value: 'Dell' },
      { label: 'ASUS Zenbook', value: 'Asus' },
      { label: 'iPad & Galaxy Tab', value: 'Tab' },
      { label: 'Màn hình Samsung & Acer', value: 'Inch' },
    ],
    storageOptions: ['256GB SSD', '512GB SSD', '1TB SSD', '2TB SSD'],
    slides: [
      {
        id: 1,
        heroTitle: 'MacBook Pro M3 Max',
        heroTag: 'Quái Thú Đồ Họa. Pin 22 Giờ',
        heroImage: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=700&q=85',
        badges: ['Giảm 4Tr', 'Tặng Magic Mouse', 'Trả chậm 0%'],
        subText: 'Màn hình Liquid Retina XDR cực đỉnh • Hiệu năng render đồ họa 3D nhanh gấp 2.5 lần',
        badgeBg: 'bg-sky-600',
      },
      {
        id: 2,
        heroTitle: 'Dell XPS 13 & 16',
        heroTag: 'Tuyệt Tác Viền Mỏng Vô Cực',
        heroImage: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=700&q=85',
        badges: ['Tặng Balo Gaming', 'Giảm 10% HSSV', 'Bảo hành 24/7'],
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
      { label: 'AirPods & Beats', value: 'Air' },
      { label: 'Ổ cứng SSD & HDD', value: 'SSD' },
      { label: 'WD Gaming & Elements', value: 'WD' },
      { label: 'Apple Watch & MagSafe', value: 'Apple' },
    ],
    storageOptions: [],
    slides: [
      {
        id: 1,
        heroTitle: 'AirPods Pro 2 USB-C',
        heroTag: 'Chủ Động Khử Ồn Gấp 2 Lần',
        heroImage: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=700&q=85',
        badges: ['Giảm 1.2Tr kèm máy', 'Khắc tên miễn phí', 'Đổi trả 30 ngày'],
        subText: 'Âm thanh không gian Spatial Audio sống động • Kháng bụi kháng nước chuẩn IP54',
        badgeBg: 'bg-indigo-600',
      },
      {
        id: 2,
        heroTitle: 'Bàn Phím Cơ Keychron K2 Pro',
        heroTag: 'Gõ Phím Êm Ái. Nâng Tầm Setup',
        heroImage: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=700&q=85',
        badges: ['Tặng Keycap PBT', 'Bluetooth 5.1', '1 đổi 1 12T'],
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

export default function CategoryProductView({
  categorySlug,
  currentQuery = '',
  products = [],
  total = 0,
  currentPage = 1,
  totalPages = 1,
  loading = false,
  currentSort = 'newest',
  currentBrand = '',
  currentMinPrice = '',
  currentMaxPrice = '',
  updateFilters,
  resetFilters,
}) {

  const isCategoryKnown = Boolean(categorySlug && CATEGORY_CONFIGS[categorySlug]);
  const config = CATEGORY_CONFIGS[categorySlug] || CATEGORY_CONFIGS['dien-thoai'];
  const slides = config.slides;
  const pageTitle = currentQuery
    ? `Kết quả tìm kiếm cho "${currentQuery}"`
    : isCategoryKnown
    ? config.categoryTitle
    : 'Tất cả sản phẩm công nghệ';
  const pageSubtitle = currentQuery
    ? `Tìm thấy ${total} sản phẩm phù hợp với từ khóa "${currentQuery}".`
    : isCategoryKnown
    ? config.categorySubtitle
    : 'Khám phá toàn bộ điện thoại, laptop và phụ kiện chính hãng đang kinh doanh tại TechStore.';

  // Banner carousel state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = next, -1 = prev
  const [isHovered, setIsHovered] = useState(false);

  // Filter & inline keyword search states
  const [activeSeries, setActiveSeries] = useState('');
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(currentQuery || '');

  useEffect(() => {
    setSearchInput(currentQuery || '');
  }, [currentQuery]);

  // Reset local series filter & carousel slide when switching category
  useEffect(() => {
    setActiveSeries('');
    setCurrentSlide(0);
  }, [categorySlug]);

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

  const activeSlideData = slides[currentSlide] || slides[0];

  // Slide animation variants (opacity fade keeps text strictly within banner bounds)
  const slideVariants = {
    enter: () => ({
      opacity: 0,
    }),
    center: {
      opacity: 1,
      transition: { duration: 0.3, ease: [0.25, 1, 0.5, 1] },
    },
    exit: () => ({
      opacity: 0,
      transition: { duration: 0.2, ease: [0.25, 1, 0.5, 1] },
    }),
  };

  const handleCategorySearchSubmit = (e) => {
    e.preventDefault();
    updateFilters({ q: searchInput.trim() });
  };

  return (
    <div className="space-y-6 text-neutral-900 min-w-0 w-full">
      {/* 1. Header Section: Title, Subtitle & Inline Search */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 text-balance">
            {pageTitle}
          </h1>
          <p className="text-sm text-neutral-600 max-w-3xl leading-relaxed text-pretty">
            {pageSubtitle}
          </p>
        </div>

        <form onSubmit={handleCategorySearchSubmit} className="w-full md:w-80 shrink-0">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm trong danh mục..."
              aria-label="Tìm kiếm trong danh mục"
              className="w-full pl-10 pr-24 py-2.5 rounded-full bg-white border border-neutral-200 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
            {(searchInput || currentQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  updateFilters({ q: '' });
                }}
                className="absolute right-16 p-1 text-neutral-500 hover:text-neutral-800 cursor-pointer"
                aria-label="Xóa từ khóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-1.5 px-3 py-1.5 rounded-full bg-brand-blue hover:bg-brand-blue-hover text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Tìm
            </button>
          </div>
        </form>
      </div>

      {/* 2. Interactive Banner Carousel (compact height so products stay visible above the fold) */}
      {isCategoryKnown && !currentQuery && (
      <div 
        className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-neutral-50 via-white to-neutral-100 border border-neutral-200/90 shadow-sm px-14 sm:px-16 py-4 sm:py-6"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative py-1 flex items-center overflow-hidden">
          <AnimatePresence custom={direction} mode="wait">
            <motion.div
              key={activeSlideData.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-8 items-center w-full"
            >
              {/* Left Column: Product Name & High-res Cutout */}
              <div className="md:col-span-5 flex flex-col justify-center items-center md:items-start text-center md:text-left space-y-2.5 sm:space-y-3">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-neutral-950 text-balance">
                  {activeSlideData.heroTitle}
                </h2>
                <div className="relative w-full max-w-[170px] sm:max-w-[200px] aspect-[4/3] flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeSlideData.heroImage}
                    alt={activeSlideData.heroTitle}
                    className="w-full h-full object-contain filter drop-shadow-xl"
                  />
                </div>
              </div>

              {/* Right Column: Slogan & Promo Badges */}
              <div className="md:col-span-7 flex flex-col justify-center items-center md:items-end text-center md:text-right space-y-2.5 sm:space-y-3">
                <span className="text-xl sm:text-2xl lg:text-3xl font-black text-rose-600 tracking-tight text-balance">
                  {activeSlideData.heroTag}
                </span>

                {/* Promo Badges (Pills) */}
                <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 pt-1">
                  {activeSlideData.badges.map((badge, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-full bg-rose-600 text-white text-xs font-bold whitespace-nowrap"
                    >
                      {badge}
                    </span>
                  ))}
                </div>

                <p className="text-xs sm:text-sm text-neutral-600 max-w-lg leading-relaxed pt-1 text-pretty">
                  {activeSlideData.subText}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Carousel Prev Button */}
        <button
          type="button"
          onClick={prevSlide}
          className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white hover:bg-neutral-200 text-neutral-800 shadow-md border border-neutral-200 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Slide trước"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Carousel Next Button */}
        <button
          type="button"
          onClick={nextSlide}
          className="absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white hover:bg-neutral-200 text-neutral-800 shadow-md border border-neutral-200 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Slide tiếp theo"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Pagination Dots (Clickable) */}
        <div className="flex items-center justify-center gap-1 pt-3">
          {slides.map((s, idx) => {
            const isActive = idx === currentSlide;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => goToSlide(idx)}
                className="w-8 h-8 flex items-center justify-center cursor-pointer"
                aria-label={`Chuyển tới slide ${idx + 1}`}
              >
                <span
                  className={`transition-all rounded-full h-2 block ${
                    isActive 
                      ? 'w-7 bg-neutral-900' 
                      : 'w-2 bg-neutral-300 hover:bg-neutral-400'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>
      )}

      {/* 3. Horizontal Filter Bar: [ ∇ Bộ lọc ] + Series Pills (Light Theme) */}
      <div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pr-10 lg:pr-0 no-scrollbar [mask-image:linear-gradient(to_right,black_calc(100%-32px),transparent)] lg:[mask-image:none]">
          {/* Toggle Filter Drawer Button */}
          <button
            type="button"
            onClick={() => setFilterDrawerOpen(!filterDrawerOpen)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-colors shrink-0 border shadow-sm cursor-pointer ${
              filterDrawerOpen || currentMinPrice || currentMaxPrice || currentBrand
                ? 'bg-brand-blue text-white border-brand-blue'
                : 'bg-white text-neutral-800 border-neutral-300 hover:bg-neutral-100'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Bộ lọc
            {(currentMinPrice || currentMaxPrice || currentBrand) && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            )}
          </button>

          {/* Series Pills (Tất cả, Apple iPhone, v.v.) */}
          {config.seriesPills.map((sp) => {
            const isSelected = activeSeries === sp.value;
            return (
              <button
                key={sp.label}
                type="button"
                onClick={() => setActiveSeries(isSelected && sp.value !== '' ? '' : sp.value)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-colors border shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                    : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-200/70 hover:border-neutral-300'
                }`}
              >
                {sp.label}
              </button>
            );
          })}
        </div>
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
              type="button"
              onClick={() => setFilterDrawerOpen(false)}
              className="p-1.5 text-neutral-500 hover:text-neutral-800 cursor-pointer"
              aria-label="Đóng bộ lọc"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
            {/* Quick Price Range Chips */}
            <div className="lg:col-span-6">
              <span className="text-xs font-semibold text-neutral-700 block mb-2">
                Khoảng giá
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Tất cả', min: '', max: '' },
                  { label: 'Dưới 10Tr', min: '0', max: '10000000' },
                  { label: '10 - 20Tr', min: '10000000', max: '20000000' },
                  { label: '20 - 30Tr', min: '20000000', max: '30000000' },
                  { label: 'Trên 30Tr', min: '30000000', max: '' },
                ].map((chip) => {
                  const isActive =
                    (currentMinPrice || '') === chip.min &&
                    (currentMaxPrice || '') === chip.max;
                  return (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => updateFilters({ minPrice: chip.min, maxPrice: chip.max })}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors border whitespace-nowrap cursor-pointer ${
                        isActive
                          ? 'bg-brand-blue text-white border-brand-blue'
                          : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-200/70'
                      }`}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Brand Filter */}
            <div className="lg:col-span-4">
              <label htmlFor="category-brand-filter" className="text-xs font-semibold text-neutral-700 block mb-2">
                Hãng sản xuất
              </label>
              <div className="relative">
                <select
                  id="category-brand-filter"
                  value={currentBrand}
                  onChange={(e) => updateFilters({ brand: e.target.value })}
                  className="w-full appearance-none bg-white text-xs font-semibold text-neutral-800 pl-3.5 pr-9 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-brand-blue cursor-pointer"
                >
                  <option value="">Tất cả thương hiệu</option>
                  <option value="Apple">Apple</option>
                  <option value="Samsung">Samsung</option>
                  <option value="Xiaomi">Xiaomi</option>
                  <option value="Dell">Dell</option>
                  <option value="ASUS">ASUS</option>
                  <option value="Lenovo">Lenovo</option>
                  <option value="Huawei">Huawei</option>
                  <option value="Oppo">Oppo</option>
                  <option value="Realme">Realme</option>
                  <option value="Vivo">Vivo</option>
                  <option value="Beats">Beats</option>
                  <option value="Amazon">Amazon</option>
                  <option value="Acer">Acer</option>
                  <option value="WD">WD</option>
                  <option value="SanDisk">SanDisk</option>
                  <option value="Silicon Power">Silicon Power</option>
                  <option value="Keychron">Keychron</option>
                  <option value="Anker">Anker</option>
                  <option value="Logitech">Logitech</option>
                </select>
                <ChevronDown className="w-4 h-4 text-neutral-500 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Reset button */}
            <div className="lg:col-span-2 flex items-end">
              <button
                type="button"
                onClick={() => {
                  setActiveSeries('');
                  resetFilters();
                  setFilterDrawerOpen(false);
                }}
                className="w-full py-2.5 px-4 bg-neutral-200 hover:bg-neutral-300 text-xs font-bold text-neutral-800 rounded-xl transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Đặt lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Sort Options Row: Mới nhất • Nổi bật • Giá tăng dần • Giá giảm dần */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs pt-2 border-b border-neutral-200 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-neutral-600 font-semibold shrink-0">Sắp xếp theo:</span>
          <div className="flex items-center gap-3 sm:gap-5 overflow-x-auto pr-8 sm:pr-0 no-scrollbar [mask-image:linear-gradient(to_right,black_calc(100%-32px),transparent)] sm:[mask-image:none]">
            {SORT_ITEMS.map((item) => {
              const isActive = (currentSort || 'newest') === item.value;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => updateFilters({ sort: item.value })}
                  className={`py-2 whitespace-nowrap font-semibold transition-colors cursor-pointer shrink-0 ${
                    isActive
                      ? 'text-neutral-950 font-bold underline underline-offset-4 decoration-2 decoration-brand-blue'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <span className="text-neutral-600 font-semibold tabular-nums">
          {displayedProducts.length} sản phẩm
        </span>
      </div>

      {/* 6. Product Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="p-3 sm:p-5 rounded-2xl bg-white border border-neutral-200/80 space-y-4 animate-pulse"
            >
              <div className="h-4 w-20 bg-neutral-100 rounded-full" />
              <div className="aspect-square w-full bg-neutral-100 rounded-xl" />
              <div className="h-5 w-3/4 bg-neutral-100 rounded" />
              <div className="h-6 w-1/2 bg-neutral-100 rounded" />
              <div className="h-9 w-full bg-neutral-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : displayedProducts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-neutral-200/80 p-8 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-neutral-800">
            Không tìm thấy sản phẩm nào
          </h3>
          <p className="text-xs text-neutral-600 max-w-md mx-auto text-pretty">
            Không có sản phẩm nào phù hợp với bộ lọc hiện tại. Vui lòng chọn dòng sản phẩm khác hoặc đặt lại bộ lọc.
          </p>
          <button
            type="button"
            onClick={() => {
              setActiveSeries('');
              resetFilters();
            }}
            className="px-5 py-2.5 rounded-full bg-brand-blue text-white text-xs font-bold hover:bg-brand-blue-hover transition-colors inline-flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Xem tất cả sản phẩm
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {displayedProducts.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-neutral-200 text-xs">
              <span className="text-neutral-600 font-medium tabular-nums">
                Trang {currentPage} / {totalPages} • Tổng {total} sản phẩm
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => updateFilters({ page: currentPage - 1 })}
                  className="px-3.5 py-2 rounded-xl border border-neutral-200 bg-white font-semibold text-neutral-700 hover:bg-neutral-100 whitespace-nowrap shrink-0 disabled:opacity-40 cursor-pointer"
                >
                  ‹ Trước
                </button>
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNo) => (
                  <button
                    key={pageNo}
                    type="button"
                    onClick={() => updateFilters({ page: pageNo })}
                    className={`w-9 h-9 rounded-xl font-bold transition-colors cursor-pointer tabular-nums shrink-0 ${
                      pageNo === currentPage
                        ? 'bg-neutral-900 text-white'
                        : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    {pageNo}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => updateFilters({ page: currentPage + 1 })}
                  className="px-3.5 py-2 rounded-xl border border-neutral-200 bg-white font-semibold text-neutral-700 hover:bg-neutral-100 whitespace-nowrap shrink-0 disabled:opacity-40 cursor-pointer"
                >
                  Sau ›
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}